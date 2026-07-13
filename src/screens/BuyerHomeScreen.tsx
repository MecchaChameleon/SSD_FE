import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AppHeader,
  BottomNavigation,
  Product,
  ProductCard,
  ReservationStatus,
} from "../components/home";
import { Chip } from "../components/ui";
import { colors, radius } from "../theme";
import ChevronDownIcon from "../../icon/chevron_down.svg";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import SearchIcon from "../../icon/search.svg";
import CloseIcon from "../../icon/x.svg";
import { ReservationScreen } from "./ReservationScreen";
import { MyPageScreen } from "./MyPageScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import {
  ReservationHistoryScreen,
  ReservationItem,
} from "./ReservationHistoryScreen";
import { buyerApi, BusinessType, Product as ApiProduct } from "../api";

export type PurchasePayload = {
  productId: number;
  productName: string;
  originalPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};
const categories = [
  "전체",
  "음식점",
  "숙박",
  "체험",
  "렌탈 / 모빌리티",
] as const;
type BuyerCategory = (typeof categories)[number];
const businessTypeByCategory: Partial<Record<BuyerCategory, BusinessType>> = {
  음식점: "RESTAURANT",
  숙박: "LODGING",
  체험: "EXPERIENCE",
  "렌탈 / 모빌리티": "RENTAL_MOBILITY",
};
const sorts = [
  "AI 추천순",
  "가까운 거리순",
  "마감 임박순",
  "낮은 가격순",
  "높은 가격순",
  "낮은 할인율순",
  "높은 할인율순",
] as const;
const categoryLabels: Record<ApiProduct["category"], string> = {
  SAME_DAY_INVENTORY: "당일 재고",
  EMPTY_TIME_RESOURCE: "빈 시간대 자원",
  SAME_DAY_ROOM: "당일 공실",
  TOUR_REMAINDER: "이동/관광 잔여 상품",
};
const money = (v: string) => Number(v.replace(/[^0-9]/g, ""));
const apiProductToCard = (p: ApiProduct): Product => {
  const deadlineAt = new Date(p.deadline).getTime();
  const discountRate =
    p.discountRate ?? Math.round((1 - p.currentPrice / p.price) * 100);
  return {
    id: p.id,
    title: p.name,
    discount: `${discountRate}%`,
    shop: p.businessName ?? "",
    location: p.address ?? "",
    detail: `${categoryLabels[p.category]} · 마감 ${new Date(deadlineAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`,
    insight: p.aiInsight ?? "현재 판매 중인 마감 상품입니다.",
    original: `${p.price.toLocaleString()}원`,
    price: `${p.currentPrice.toLocaleString()}원`,
    remaining: `잔여수량 ${p.qty}개`,
    urgent:
      deadlineAt > Date.now() && deadlineAt - Date.now() <= 60 * 60 * 1000,
    deadlineAt,
    distanceMeters: p.distanceMeters,
    discountRate,
  };
};
const reservationStatus = (status:string):ReservationStatus => status==='REQUESTED'?'waiting':status==='APPROVED'?'confirmed':status==='REJECTED'?'rejected':status==='COMPLETED'?'completed':status==='CANCELED'?'canceled':'noshow';
const apiReservationToItem = (item: any): ReservationItem => ({
  id: item.id,
  product: {
    id: item.productId,
    title: item.productName,
    discount: "",
    shop: item.businessName ?? "",
    location: "",
    detail: "예약 상품",
    insight: "",
    original: `${item.unitPrice.toLocaleString()}원`,
    price: `${item.unitPrice.toLocaleString()}원`,
    remaining: "",
  },
  status: reservationStatus(item.status),
  quantity: item.quantity,
  reservedAt: item.requestedAt,
});

export function BuyerHomeScreen({
  onLogout,
  onWithdraw,
  onPurchase,
}: {
  onLogout: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  onPurchase?: (payload: PurchasePayload) => void | Promise<void>;
}) {
  const [category, setCategory] = useState<BuyerCategory>("전체");
  const [productItems, setProductItems] = useState<Product[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [purchase, setPurchase] = useState<Product | null>(null);
  const [reserve, setReserve] = useState<Product | null>(null);
  const [status, setStatus] = useState<ReservationStatus | undefined>();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tab, setTab] = useState<"home" | "reservations" | "mypage">("home");
  const [sellerMode, setSellerMode] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("AI 추천순");
  const [sortOpen, setSortOpen] = useState(false);
  const [aiInfo, setAiInfo] = useState(false);
  const [quantity, setQuantity] = useState(2);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (sellerMode) return;
    buyerApi
      .products({ size: 50, businessType: businessTypeByCategory[category] })
      .then((page) => setProductItems(page.content.map(apiProductToCard)))
      .catch(() => setProductItems([]));
    buyerApi
      .wishlist({ size: 50 })
      .then((page) => setLiked(page.content.map((item) => item.id)))
      .catch(() => undefined);
    buyerApi
      .reservations({ size: 50 })
      .then((page) => setReservations(page.content.map(apiReservationToItem)))
      .catch(() => undefined);
  }, [tab, sellerMode, category]);
  const shown = useMemo(() => {
    let list = productItems.map((item) => ({
      ...item,
      urgent:
        !!item.deadlineAt &&
        item.deadlineAt > now &&
        item.deadlineAt - now <= 60 * 60 * 1000,
    })).filter(
      (p) =>
        !query.trim() ||
        `${p.title} ${p.shop} ${p.location}`.includes(query.trim()),
    );
    if (sort === "낮은 가격순")
      list = [...list].sort((a, b) => money(a.price) - money(b.price));
    if (sort === "높은 가격순")
      list = [...list].sort((a, b) => money(b.price) - money(a.price));
    if (sort === "가까운 거리순")
      list = [...list].sort(
        (a, b) =>
          (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
      );
    if (sort === "마감 임박순")
      list = [...list].sort(
        (a, b) =>
          (a.deadlineAt ?? Number.MAX_SAFE_INTEGER) -
          (b.deadlineAt ?? Number.MAX_SAFE_INTEGER),
      );
    if (sort === "낮은 할인율순")
      list = [...list].sort(
        (a, b) => (a.discountRate ?? 0) - (b.discountRate ?? 0),
      );
    if (sort === "높은 할인율순")
      list = [...list].sort(
        (a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0),
      );
    return list;
  }, [productItems, query, sort, now]);
  const submitSearch = () => {
    const value = query.trim();
    if (value)
      setRecent((v) => [value, ...v.filter((x) => x !== value)].slice(0, 5));
    setSearching(false);
  };
  const confirmPurchase = async () => {
    if (!purchase) return;
    await buyerApi.purchase({ productId: purchase.id, quantity });
    const payload = {
      productId: purchase.id,
      productName: purchase.title,
      originalPrice: money(purchase.original),
      unitPrice: money(purchase.price),
      quantity,
      totalPrice: money(purchase.price) * quantity,
    };
    await onPurchase?.(payload);
    setProductItems((list) =>
      list.map((item) =>
        item.id === purchase.id
          ? {
              ...item,
              remaining: `잔여수량 ${Math.max(0, money(item.remaining) - quantity)}개`,
            }
          : item,
      ),
    );
    setPurchase(null);
    void buyerApi
      .products({ size: 50, businessType: businessTypeByCategory[category] })
      .then((page) => setProductItems(page.content.map(apiProductToCard)));
  };
  const toggleLike = async (id: number) => {
    const exists = liked.includes(id);
    setLiked((v) => (exists ? v.filter((x) => x !== id) : [...v, id]));
    try {
      if (exists) await buyerApi.removeWishlist(id);
      else await buyerApi.addWishlist(id);
    } catch {
      setLiked((v) => (exists ? [...v, id] : v.filter((x) => x !== id)));
    }
  };
  const productCards = shown.map((p) => (
    <ProductCard
      key={p.id}
      product={p}
      liked={liked.includes(p.id)}
      onLike={() => toggleLike(p.id)}
      onBuy={() => {
        setQuantity(p.id === 1 ? 2 : 1);
        setPurchase(p);
      }}
      onReserve={() => setReserve(p)}
      status={p.id === 1 ? status : undefined}
      onCancel={() => setStatus(undefined)}
      onDelete={() => setStatus(undefined)}
      onReason={() =>
        Alert.alert(
          "거절 사유",
          "판매 가능한 수량이 부족하여 예약이 거절되었습니다.",
        )
      }
    />
  ));
  if (sellerMode)
    return (
      <SellerHomeScreen
        onBuyerMode={() => setSellerMode(false)}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  if (tab === "mypage")
    return (
      <MyPageScreen
        onHome={() => setTab("home")}
        onReservations={() => setTab("reservations")}
        onSellerMode={() => setSellerMode(true)}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  if (tab === "reservations")
    return (
      <ReservationHistoryScreen
        items={reservations}
        onHome={() => setTab("home")}
        onMyPage={() => setTab("mypage")}
        onCancel={(id) => {
          void buyerApi
            .cancelReservation(id, "사용자 취소")
            .then(() => setReservations((v) => v.filter((x) => x.id !== id)));
          setStatus(undefined);
        }}
        onDelete={(id) => {
          void buyerApi
            .hideReservation(id)
            .then(() => setReservations((v) => v.filter((x) => x.id !== id)));
        }}
        onBuy={(p) => {
          setQuantity(1);
          setPurchase(p);
          setTab("home");
        }}
      />
    );
  if (reserve)
    return (
      <ReservationScreen
        product={reserve}
        onClose={() => setReserve(null)}
        onComplete={(reservedQuantity) => {
          setStatus("waiting");
          setLiked((v) => (v.includes(reserve.id) ? v : [...v, reserve.id]));
          setReservations((v) =>
            v.some((x) => x.product.id === reserve.id)
              ? v
              : [
                  ...v,
                  {
                    id: Date.now(),
                    product: reserve,
                    status: "waiting",
                    quantity: reservedQuantity,
                    reservedAt: new Date().toISOString(),
                  },
                ],
          );
          setReserve(null);
          setTab("reservations");
        }}
      />
    );
  if (searching)
    return (
      <View style={s.root}>
        <View style={s.searchHeader}>
          <Pressable onPress={() => setSearching(false)}>
            <ChevronLeftIcon width={24} height={24} color={colors.black} />
          </Pressable>
          <View style={s.searchBox}>
            <SearchIcon width={20} height={20} color={colors.g500} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              placeholder="검색"
              placeholderTextColor={colors.g500}
              style={s.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")}>
                <CloseIcon width={18} height={18} color={colors.g500} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={s.recentHead}>
          <Text style={s.recentTitle}>최근 검색</Text>
          <Pressable onPress={() => setRecent([])}>
            <Text style={s.clear}>모두 삭제</Text>
          </Pressable>
        </View>
        {recent.map((x) => (
          <Pressable
            key={x}
            onPress={() => {
              setQuery(x);
              setSearching(false);
            }}
            style={s.recentItem}
          >
            <Text style={s.recentText}>{x}</Text>
            <Pressable
              onPress={() => setRecent((v) => v.filter((i) => i !== x))}
            >
              <CloseIcon width={18} height={18} color={colors.g400} />
            </Pressable>
          </Pressable>
        ))}
      </View>
    );
  return (
    <View style={s.root}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => setSearching(true)} style={s.searchBar}>
          <SearchIcon width={20} height={20} color={colors.g500} />
          <Text style={[s.searchPlaceholder, query && s.searchValue]}>
            {query || "검색"}
          </Text>
        </Pressable>
        <Text style={s.heading}>로컬타임이 찾은 오늘 마감 특가 상품</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {categories.map((x) => (
            <Chip
              key={x}
              selected={category === x}
              onPress={() => setCategory(x)}
            >
              {x}
            </Chip>
          ))}
        </ScrollView>
        <View style={s.sortArea}>
          <Pressable
            onPress={() => {
              setSortOpen((v) => !v);
              setAiInfo(false);
            }}
            style={s.sort}
          >
            <Text style={s.sortText}>{sort}</Text>
            <ChevronDownIcon width={20} height={20} color={colors.g500} />
          </Pressable>
          {sortOpen ? (
            <View style={s.sortMenu}>
              {sorts.map((x, index) =>
                index === 0 ? (
                  <View key={x} style={s.sortOption}>
                    <Pressable
                      onPress={() => {
                        setSort(x);
                        setSortOpen(false);
                        setAiInfo(false);
                      }}
                    >
                      <Text
                        style={[s.sortOptionText, sort === x && s.selectedSort]}
                      >
                        {x}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="AI 추천 기준 안내"
                      hitSlop={8}
                      onPress={() => setAiInfo((v) => !v)}
                    >
                      <Text style={s.infoIcon}>ⓘ</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    key={x}
                    onPress={() => {
                      setSort(x);
                      setSortOpen(false);
                      setAiInfo(false);
                    }}
                    style={s.sortOption}
                  >
                    <Text
                      style={[s.sortOptionText, sort === x && s.selectedSort]}
                    >
                      {x}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          ) : null}
          {sortOpen && aiInfo ? (
            <View style={s.aiTooltip}>
              <Text style={s.aiText}>
                현재 날씨, 주변 유동인구, 거리를 기반으로 로컬 AI가 최적의 마감
                상품을 실시간 추천드려요.
              </Text>
            </View>
          ) : null}
        </View>
        {productCards.length > 0 ? (
          productCards
        ) : (
          <Text style={s.empty}>검색 결과가 없습니다.</Text>
        )}
      </ScrollView>
      <BottomNavigation active="home" onSelect={setTab} />
      <PurchaseModal
        product={purchase}
        quantity={quantity}
        onQuantity={setQuantity}
        onClose={() => setPurchase(null)}
        onConfirm={confirmPurchase}
      />
    </View>
  );
}
function PurchaseModal({
  product,
  quantity,
  onQuantity,
  onClose,
  onConfirm,
}: {
  product: Product | null;
  quantity: number;
  onQuantity: (v: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!product) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>상품을 구매하시겠습니까?</Text>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>결제금액</Text>
            <Text style={s.total}>
              {(money(product.price) * quantity).toLocaleString()}원
            </Text>
          </View>
          <View style={s.summary}>
            <Summary label="상품명" value={product.title} />
            <Summary label="정가" value={product.original} />
            <Summary label="할인가" value={product.price} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>구매 수량</Text>
              <View style={s.stepper}>
                <Pressable
                  onPress={() => onQuantity(Math.max(1, quantity - 1))}
                  style={s.step}
                >
                  <Text>−</Text>
                </Pressable>
                <Text style={s.quantity}>{quantity}개</Text>
                <Pressable
                  onPress={() => onQuantity(quantity + 1)}
                  style={s.step}
                >
                  <Text>＋</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={s.dialogButtons}>
            <Pressable onPress={onClose} style={[s.dialogButton, s.cancel]}>
              <Text style={s.buttonText}>취소</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[s.dialogButton, s.buy]}>
              <Text style={s.buttonText}>구매하기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={s.summaryValue}>
        {value}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 92 },
  searchBar: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.g100,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchPlaceholder: { fontSize: 14, color: colors.g500 },
  searchValue: { color: colors.black },
  heading: {
    marginLeft: 2,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
    color: colors.black,
    marginBottom: 16,
  },
  chips: { gap: 8, paddingRight: 14 },
  sortArea: {
    height: 48,
    alignItems: "flex-end",
    justifyContent: "center",
    position: "relative",
    zIndex: 20,
    elevation: 20,
  },
  sort: { flexDirection: "row", alignItems: "center", gap: 2 },
  sortText: { fontSize: 12, color: colors.g500 },
  sortMenu: {
    position: "absolute",
    right: 0,
    top: 40,
    width: 108,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 2,
    zIndex: 30,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sortOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortOptionText: { fontSize: 11, color: colors.g400 },
  selectedSort: { fontWeight: "600", color: colors.black },
  infoIcon: { fontSize: 12, color: colors.g500 },
  aiTooltip: {
    position: "absolute",
    right: 112,
    top: 4,
    width: 178,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 4,
    backgroundColor: colors.g800,
    zIndex: 40,
    elevation: 16,
  },
  aiText: { fontSize: 9, lineHeight: 12, color: colors.white },
  empty: { paddingVertical: 80, textAlign: "center", color: colors.g500 },
  searchHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  searchBox: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.g100,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    paddingVertical: 0,
  },
  recentHead: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recentTitle: { fontSize: 16, fontWeight: "600" },
  clear: { fontSize: 12, color: colors.g500 },
  recentItem: {
    height: 48,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  recentText: { fontSize: 14, color: colors.g800 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 370,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: 20,
    gap: 20,
  },
  dialogTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.black,
  },
  totalRow: { alignItems: "center", gap: 6 },
  totalLabel: { fontSize: 14, color: colors.g600 },
  total: { fontSize: 24, fontWeight: "700", color: colors.black },
  summary: { borderTopWidth: 1, borderTopColor: colors.g200, paddingTop: 10 },
  summaryRow: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { width: 80, fontSize: 14, color: colors.g600 },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "500",
    color: colors.black,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  step: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.g100,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  dialogButtons: { flexDirection: "row", gap: 8 },
  dialogButton: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: { backgroundColor: colors.g300 },
  buy: { backgroundColor: colors.primary500 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
