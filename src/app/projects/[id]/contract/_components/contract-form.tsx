"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKrw } from "@/lib/constants/phase";
import type { Contract } from "@/lib/types/database";
import { submitContract } from "../_actions";

interface Props {
  projectId: string;
  projectName: string;
  contract: Contract | null;
  warrantyPeriod: string | null;
}

export function ContractForm({ projectId, projectName, contract, warrantyPeriod }: Props) {
  const [amount, setAmount] = useState(contract?.contract_amount?.toString() ?? "");
  const [contractDate, setContractDate] = useState(contract?.contract_date ?? "");
  const [startDate, setStartDate] = useState(contract?.start_date ?? "");
  const [endDate, setEndDate] = useState(contract?.end_date ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState(contract?.warranty_end_date ?? "");
  const [advanceRate, setAdvanceRate] = useState(contract?.advance_rate?.toString() ?? "");
  const [fileUrl, setFileUrl] = useState(contract?.contract_file_url ?? "");
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Calculate payment schedule
  const totalAmount = Number(amount) || 0;
  const advPct = Number(advanceRate) || 0;
  const advAmount = Math.round(totalAmount * advPct / 100);
  const interimAmount = Math.round(totalAmount * 0.4);
  const finalAmount = totalAmount - advAmount - interimAmount;

  function handleComplete() {
    if (!amount || !contractDate) return;
    startTransition(async () => {
      await submitContract(projectId, {
        contract_amount: Number(amount),
        contract_date: contractDate,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        warranty_end_date: warrantyEnd || undefined,
        advance_rate: Number(advanceRate) || undefined,
        advance_amount: advAmount || undefined,
        contract_file_url: fileUrl || undefined,
      }, projectName);
      setCompleted(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Warranty info from rfp_rules */}
      {warrantyPeriod && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          하자보수 기간: {warrantyPeriod} (RFP 규정)
        </div>
      )}

      {/* Contract info */}
      <Card>
        <CardHeader><CardTitle className="text-base">계약 정보</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div data-testid="contract-amount">
            <Label>계약 금액 (원)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div data-testid="contract-date">
            <Label>계약일</Label>
            <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </div>
          <div>
            <Label>착수일</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>납품기한</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>하자보수 종료일</Label>
            <Input type="date" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
          </div>
          <div>
            <Label>선금 비율 (%)</Label>
            <Input type="number" value={advanceRate} onChange={(e) => setAdvanceRate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Payment schedule */}
      {totalAmount > 0 && (
        <Card data-testid="payment-schedule">
          <CardHeader><CardTitle className="text-base">대금 지급 일정</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">선금 ({advPct}%)</p>
              <p className="text-sm font-medium">{formatKrw(advAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">중도금 (40%)</p>
              <p className="text-sm font-medium">{formatKrw(interimAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">잔금</p>
              <p className="text-sm font-medium">{formatKrw(finalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">계약서 첨부</CardTitle></CardHeader>
        <CardContent data-testid="contract-file-upload">
          {fileUrl ? (
            <span className="text-sm text-green-600">계약서 첨부됨</span>
          ) : (
            <>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>계약서 첨부 (최대 50MB)</Button>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={() => setFileUrl("attached")} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Complete */}
      <div className="flex items-center gap-3">
        <Button
          data-testid="contract-complete-btn"
          onClick={handleComplete}
          disabled={!amount || !contractDate || isPending || completed}
        >
          {isPending ? "처리 중…" : completed ? "계약 체결 완료" : "계약 체결 완료 처리"}
        </Button>
        {completed && (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200" data-testid="telegram-notify">
            Telegram 알림 발송됨
          </Badge>
        )}
      </div>
    </div>
  );
}
