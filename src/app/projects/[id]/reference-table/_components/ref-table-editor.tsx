"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Progress } from "@/components/ui/progress";
import type { ReferenceTableItem } from "@/lib/types/database";
import { saveRefItem } from "../_actions";

interface Props {
  projectId: string;
  projectName: string;
  items: ReferenceTableItem[];
  implTypes: string[];
  totalCount: number;
  reviewedCount: number;
}

export function RefTableEditor({
  projectId,
  projectName,
  items: initialItems,
  implTypes,
  totalCount,
  reviewedCount: initialReviewed,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [reviewedCount, setReviewedCount] = useState(initialReviewed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPage, setEditPage] = useState("");
  const [editImpl, setEditImpl] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const pct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  function startEdit(item: ReferenceTableItem) {
    setEditingId(item.id);
    setEditPage(item.proposal_page ?? "");
    setEditImpl(item.impl_type ?? "");
    setEditReason(item.description ?? "");
  }

  function handleSave(itemId: string, markReviewed: boolean) {
    const isFeasible = editImpl !== "불가";

    if (!isFeasible && !editReason.trim()) return; // 불가사유 필수

    startTransition(async () => {
      await saveRefItem(itemId, {
        proposal_page: editPage || null,
        impl_type: editImpl || null,
        impl_type_display: editImpl ? editImpl.slice(0, 10) : null,
        description: !isFeasible ? editReason : null,
        reviewed: markReviewed,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                proposal_page: editPage || null,
                impl_type: editImpl || null,
                description: !isFeasible ? editReason : i.description,
                reviewed: markReviewed ? true : i.reviewed,
              }
            : i,
        ),
      );

      if (markReviewed) {
        setReviewedCount((c) => c + 1);
      }
      setEditingId(null);
    });
  }

  async function handleExport() {
    const res = await fetch("/api/reference-table/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, projectName }),
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${projectName}_참조표_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex-1" data-testid="ref-table-pct">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">완성률</span>
            <span>{pct}% ({reviewedCount}/{totalCount})</span>
          </div>
          <Progress value={pct} />
        </div>
        <Button
          variant="outline"
          className="ml-4"
          data-testid="ref-export-btn"
          onClick={handleExport}
        >
          엑셀 내보내기
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">요구사항ID</TableHead>
              <TableHead>요구사항명</TableHead>
              <TableHead className="w-[100px]">AI매핑 페이지</TableHead>
              <TableHead className="w-[120px]">구현방식</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody data-testid="ref-table-list">
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  참조표 항목이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isEditing = editingId === item.id;
                const isFeasible = isEditing ? editImpl !== "불가" : item.impl_type !== "불가";

                return (
                  <TableRow key={item.id} data-testid={`ref-table-item-${item.id}`}>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.requirement_id ?? "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{item.requirement_name}</span>
                      {/* Infeasible reason */}
                      {isEditing && !isFeasible && (
                        <div className="mt-1" data-testid={`ref-infeasible-${item.id}`}>
                          <Input
                            data-testid={`ref-reason-${item.id}`}
                            placeholder="불가사유 입력 (필수)"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="max-w-xs text-xs"
                          />
                        </div>
                      )}
                      {!isEditing && !isFeasible && item.description && (
                        <p className="mt-1 text-xs text-red-500" data-testid={`ref-infeasible-${item.id}`}>
                          불가사유: {item.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          data-testid={`ref-page-input-${item.id}`}
                          value={editPage}
                          onChange={(e) => setEditPage(e.target.value)}
                          placeholder="p."
                          className="w-20 text-xs"
                        />
                      ) : (
                        <span className="text-xs">
                          {item.proposal_page ? `p.${item.proposal_page}` : "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editImpl} onValueChange={setEditImpl}>
                          <SelectTrigger className="w-[110px] text-xs" data-testid={`ref-impl-select-${item.id}`}>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {implTypes.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                            <SelectItem value="불가">불가</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{item.impl_type ?? "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.reviewed ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-200"
                          data-testid={`ref-reviewed-${item.id}`}
                        >
                          검토완료
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
                          미검토
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(item.id, true)}
                            disabled={isPending || (!isFeasible && !editReason.trim())}
                            className="text-xs"
                          >
                            확인
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="text-xs"
                          >
                            취소
                          </Button>
                        </div>
                      ) : !item.reviewed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                          className="text-xs"
                        >
                          수정
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
