import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SalesHistoryItem, sellerApi } from "../api";
import { colors, radius } from "../theme";
import ChevronLeft from "../../icon/chevron_left.svg";

const money = (value: number) => `${value.toLocaleString()}원`;
const displayDate = (value: string) => value.replace(/-/g, ".");
const soldAtLabel = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function SalesHistoryScreen({
  startDate,
  endDate,
  totalRevenue,
  onBack,
}: {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  onBack: () => void;
}) {
  const [items, setItems] = useState<SalesHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);

  useEffect(() => {
    setLoading(true);
    sellerApi
      .salesHistory({ startDate, endDate, page: 0, size: 20 })
      .then((result) => {
        setItems(result.content);
        setPage(0);
        setLast(result.last);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const loadMore = () => {
    if (loading || last) return;
    const nextPage = page + 1;
    setLoading(true);
    sellerApi
      .salesHistory({ startDate, endDate, page: nextPage, size: 20 })
      .then((result) => {
        setItems((current) => [...current, ...result.content]);
        setPage(nextPage);
        setLast(result.last);
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable hitSlop={10} onPress={onBack}>
          <ChevronLeft width={24} height={24} color={colors.black} />
        </Pressable>
        <Text style={s.headerTitle}>판매 내역</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.summary}>
          <Text style={s.period}>{displayDate(startDate)} - {displayDate(endDate)}</Text>
          <Text style={s.summaryLabel}>기간 총 매출</Text>
          <Text style={s.total}>{money(totalRevenue)}</Text>
          <Text style={s.hint}>결제가 완료된 판매 건만 집계됩니다.</Text>
        </View>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>판매 내역</Text>
          <Text style={s.latest}>최신순</Text>
        </View>
        {loading && items.length === 0 ? (
          <Text style={s.empty}>판매 내역을 불러오는 중입니다.</Text>
        ) : items.length === 0 ? (
          <Text style={s.empty}>선택한 기간에 결제 완료된 판매 내역이 없습니다.</Text>
        ) : (
          <>
            {items.map((item) => <SaleItem key={item.reservationId} item={item} />)}
            {!last ? <Pressable disabled={loading} onPress={loadMore} style={s.more}><Text style={s.moreText}>{loading ? "불러오는 중..." : "판매 내역 더보기"}</Text></Pressable> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SaleItem({ item }: { item: SalesHistoryItem }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text numberOfLines={1} style={s.productName}>{item.productName}</Text>
        <Text style={s.amount}>{money(item.totalAmount)}</Text>
      </View>
      <Row label="구매자" value={item.buyerNickname} />
      <Row label="판매 수량" value={`${item.quantity}개`} />
      <Row label="개당 결제 금액" value={money(item.unitPrice)} />
      <Row label="결제 완료" value={soldAtLabel(item.soldAt)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.g200, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: colors.black },
  content: { padding: 16, paddingBottom: 40 },
  summary: { padding: 16, borderRadius: radius.md, backgroundColor: "rgba(230,230,229,.5)", marginBottom: 24 },
  period: { fontSize: 12, color: colors.g500, marginBottom: 14 },
  summaryLabel: { fontSize: 14, color: colors.g600 },
  total: { fontSize: 28, fontWeight: "700", color: colors.info, marginTop: 6 },
  hint: { fontSize: 11, color: colors.g500, marginTop: 8 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listTitle: { fontSize: 18, fontWeight: "600", color: colors.black },
  latest: { fontSize: 12, color: colors.g500 },
  card: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.md, padding: 14, gap: 9, marginBottom: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.g200 },
  productName: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.black },
  amount: { fontSize: 17, fontWeight: "700", color: colors.primary500 },
  row: { flexDirection: "row", alignItems: "center" },
  label: { width: 112, fontSize: 12, color: colors.g500 },
  value: { flex: 1, fontSize: 13, color: colors.g800, textAlign: "right" },
  empty: { paddingVertical: 100, textAlign: "center", fontSize: 14, color: colors.g500 },
  more: { height: 48, borderRadius: radius.md, backgroundColor: colors.g200, alignItems: "center", justifyContent: "center", marginTop: 4 },
  moreText: { fontSize: 14, fontWeight: "600", color: colors.g600 },
});
