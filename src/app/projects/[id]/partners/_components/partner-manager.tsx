"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKrw } from "@/lib/constants/phase";
import type { Partner, PartnerType } from "@/lib/types/database";
import { addPartner, removePartner } from "../_actions";

const PARTNER_TABS: { value: PartnerType; label: string }[] = [
  { value: "consortium", label: "공동수급" },
  { value: "subcontract", label: "하도급" },
  { value: "goods_supply", label: "물품납품" },
  { value: "direct_purchase", label: "직접구매" },
];

const STATUS_BADGE: Record<string, { text: string; className: string }> = {
  registered: { text: "등록", className: "bg-gray-100 text-gray-700 border-gray-200" },
  contacted: { text: "연락", className: "bg-blue-100 text-blue-700 border-blue-200" },
  docs_requested: { text: "서류요청", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  docs_complete: { text: "서류완료", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { text: "거절", className: "bg-red-100 text-red-700 border-red-200" },
};

interface Props {
  projectId: string;
  partners: Partner[];
  budgetAmount: number | null;
  subRateLimit: number | null;
  partnerPct: number;
}

export function PartnerManager({
  projectId,
  partners: initialPartners,
  budgetAmount,
  subRateLimit,
  partnerPct,
}: Props) {
  const [partners, setPartners] = useState(initialPartners);
  const [activeTab, setActiveTab] = useState<PartnerType>("consortium");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<PartnerType>("subcontract");
  const [formAmount, setFormAmount] = useState("");

  const filteredPartners = partners.filter((p) => p.partner_type === activeTab);

  // Calculate total sub_rate
  const totalSubAmount = partners
    .filter((p) => p.partner_type === "subcontract" && !p.is_direct_purchase)
    .reduce((sum, p) => sum + (p.sub_amount ?? 0), 0);
  const currentSubRate =
    budgetAmount && budgetAmount > 0
      ? Math.round((totalSubAmount / budgetAmount) * 10000) / 100
      : 0;
  const subRateExceeded = subRateLimit != null && currentSubRate > subRateLimit;

  function handleSubmit() {
    if (!formName.trim()) return;

    const amount = formAmount ? Number(formAmount) : null;
    const isDirectPurchase = formType === "direct_purchase";

    startTransition(async () => {
      const { partner, error } = await addPartner({
        project_id: projectId,
        partner_type: formType,
        company_name: formName.trim(),
        sub_amount: formType === "subcontract" ? amount : null,
        share_amount: formType === "consortium" ? amount : null,
        goods_amount: formType === "goods_supply" || formType === "direct_purchase" ? amount : null,
        is_direct_purchase: isDirectPurchase,
      });

      if (error) {
        setToast(`오류: ${error}`);
      } else if (partner) {
        setPartners((prev) => [...prev, partner]);
        setToast("VRB 손익에 자동 반영됨");
        setShowForm(false);
        setFormName("");
        setFormAmount("");
        setActiveTab(formType);
      }

      setTimeout(() => setToast(null), 4000);
    });
  }

  function handleDelete(partnerId: string) {
    startTransition(async () => {
      const { error } = await removePartner(partnerId);
      if (!error) {
        setPartners((prev) => prev.filter((p) => p.id !== partnerId));
        setToast("VRB 손익에 자동 반영됨");
        setTimeout(() => setToast(null), 4000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          data-testid="vrb-sync-toast"
          className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
        >
          {toast}
          {toast.includes("VRB") && (
            <Link
              href={`/projects/${projectId}/vrb`}
              className="ml-2 underline"
            >
              VRB 손익 화면 →
            </Link>
          )}
        </div>
      )}

      {/* Partner pct */}
      <div data-testid="partner-pct">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">협력업체 완료율</span>
          <span>{partnerPct}%</span>
        </div>
        <Progress value={partnerPct} />
      </div>

      {/* Sub-rate warning */}
      {subRateExceeded && (
        <div
          data-testid="sub-rate-warning"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          ⚠ 하도급 비율 {currentSubRate}%가 RFP 규정 상한 {subRateLimit}%를 초과합니다.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {PARTNER_TABS.map((tab) => {
          const count = partners.filter((p) => p.partner_type === tab.value).length;
          return (
            <button
              key={tab.value}
              data-testid={`partner-tab-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Partner table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>비율(%)</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody data-testid="partner-list">
            {filteredPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  등록된 업체가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredPartners.map((p) => {
                const amount = p.sub_amount ?? p.share_amount ?? p.goods_amount;
                const rate = p.sub_rate ?? p.share_rate;
                const status = STATUS_BADGE[p.status] ?? STATUS_BADGE.registered;

                return (
                  <TableRow key={p.id} data-testid={`partner-row-${p.id}`}>
                    <TableCell className="font-medium">{p.company_name}</TableCell>
                    <TableCell>
                      {PARTNER_TABS.find((t) => t.value === p.partner_type)?.label ?? p.partner_type}
                    </TableCell>
                    <TableCell>{formatKrw(amount)}</TableCell>
                    <TableCell>{rate != null ? `${rate}%` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add button */}
      {!showForm && (
        <Button
          data-testid="add-partner-btn"
          onClick={() => setShowForm(true)}
        >
          협력업체 추가
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <Card data-testid="partner-form">
          <CardHeader>
            <CardTitle className="text-base">협력업체 등록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="pf-name">업체명</Label>
                <Input
                  id="pf-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="업체명 입력"
                />
              </div>
              <div>
                <Label htmlFor="pf-type">유형</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as PartnerType)}>
                  <SelectTrigger id="pf-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TABS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pf-amount">금액 (원)</Label>
                <Input
                  id="pf-amount"
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="계약금액"
                />
                {formType === "subcontract" && budgetAmount && formAmount && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    하도급 비율: {((Number(formAmount) / budgetAmount) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>

            {formType === "direct_purchase" && (
              <p className="text-xs text-blue-600">
                직접구매 항목은 원가에서 제외 처리됩니다.
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isPending || !formName.trim()}>
                {isPending ? "등록 중…" : "등록"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
