import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNavigation, PaymentDisplayStatus, Product, ProductCard } from "../components/home";
import { colors, radius } from "../theme";

export type PurchaseItem = {
  id: number;
  product: Product;
  status: PaymentDisplayStatus;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchasedAt: string;
  rejectReason?: string | null;
};

export function PurchaseHistoryScreen({ items, onHome, onMap, onMyPage, onDelete }: {
  items: PurchaseItem[];
  onHome: () => void;
  onMap: () => void;
  onMyPage: () => void;
  onDelete: (id: number) => void;
}) {
  const [refunded, setRefunded] = useState<PurchaseItem | null>(null);
  return <View style={s.root}>
    <AppHeader />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>나의 결제 내역</Text>
      <Text style={s.description}>판매자 수락 전에는 결제 확인 대기 상태이며, 거절 시 자동 환불됩니다.</Text>
      {items.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>결제 내역이 없어요.</Text><Text style={s.emptyBody}>내 주변 할인 상품을 확인하고 구매해 보세요!</Text></View> : items.map(item =>
        <View key={item.id} style={s.purchaseItem}>
          <ProductCard product={item.product} liked={false} onLike={() => {}} onBuy={() => {}} status={item.status} onDelete={() => onDelete(item.id)} onReason={() => setRefunded(item)} />
          <View style={s.paymentSummary}><View style={s.summaryRow}><View><Text style={s.summaryLabel}>구매 수량</Text><Text style={s.summaryValue}>{item.quantity}개</Text></View><View style={s.summaryDivider}/><View style={s.totalGroup}><Text style={s.summaryLabel}>총 결제 금액</Text><Text style={s.totalAmount}>{item.totalAmount.toLocaleString()}원</Text></View></View></View>
        </View>
      )}
    </ScrollView>
    <BottomNavigation active="purchases" onSelect={tab => tab === "home" ? onHome() : tab === "map" ? onMap() : tab === "mypage" ? onMyPage() : undefined} />
    <Modal transparent visible={!!refunded} animationType="fade" onRequestClose={() => setRefunded(null)}>
      <View style={s.dim}><View style={s.dialog}><Text style={s.dialogTitle}>환불 사유</Text><Text style={s.reason}>{refunded?.rejectReason || "판매자 사유로 결제가 환불되었습니다."}</Text><Pressable style={s.confirm} onPress={() => setRefunded(null)}><Text style={s.confirmText}>확인</Text></Pressable></View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 92 },
  title: { fontSize: 20, fontWeight: "600", color: colors.black },
  description: { fontSize: 12, color: colors.g500, marginTop: 8, marginBottom: 20 },
  purchaseItem: { marginBottom: 16 },
  paymentSummary: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.g200, gap: 10 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 18, backgroundColor: colors.g200 },
  totalGroup: { flex: 1, alignItems: "flex-end" },
  summaryLabel: { fontSize: 14, color: colors.g500 },
  summaryValue: { fontSize: 15, fontWeight: "600", color: colors.g800 },
  totalAmount: { fontSize: 17, fontWeight: "700", color: colors.black },
  empty: { alignItems: "center", paddingTop: 180, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.g800 },
  emptyBody: { fontSize: 14, color: colors.g500, textAlign: "center" },
  dim: { flex: 1, backgroundColor: "rgba(17,17,17,.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  dialog: { width: "100%", maxWidth: 370, borderRadius: radius.lg, backgroundColor: colors.white, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: "600", textAlign: "center", color: colors.black },
  reason: { fontSize: 16, textAlign: "center", color: colors.g800, paddingVertical: 30 },
  confirm: { height: 56, borderRadius: radius.md, backgroundColor: colors.primary500, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 16, fontWeight: "600", color: colors.white },
});
