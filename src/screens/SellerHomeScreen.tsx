import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppHeader as BaseAppHeader } from "../components/home";
import { DeviceFrame } from "../components/DeviceFrame";
import { colors, radius } from "../theme";
import { SalesReportScreen } from "./SalesReportScreen";
import { SalesHistoryScreen } from "./SalesHistoryScreen";
import { RegisteredProductsScreen } from "./RegisteredProductsScreen";
import { ProductRegistrationScreen } from "./ProductRegistrationScreen";
import { SellerMyPageScreen } from "./MyPageScreen";
import { sellerApi } from "../api";
import type { Purchase as ApiPurchase } from "../api";
import { AIRecommendationScreen } from "./AIRecommendationScreen";
import CalendarIcon from "../../icon/calendar.svg";
import ChevronDown from "../../icon/chevron_down.svg";
import ChevronLeft from "../../icon/chevron_left.svg";
import ChevronRight from "../../icon/chevron_right.svg";
import HomeIcon from "../../icon/home.svg";
import ShoppingIcon from "../../icon/shopping-bag.svg";
import TrelloIcon from "../../icon/trello.svg";
import UserIcon from "../../icon/user.svg";
import CloseIcon from "../../icon/x.svg";

type SellerPage =
  "dashboard" | "payments" | "products" | "ai" | "mypage";
type PaymentState = "pending" | "accepted" | "refunded";
const AppHeader = () => <BaseAppHeader role="seller" />;
const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const displayDate = (value: string | null) => value ? value.replace(/-/g, ".") : "YYYY.MM.DD";
type Payment = {
  id: number;
  title: string;
  detail: string;
  original: string;
  price: string;
  remaining: string;
  quantity: number;
  buyerNickname: string;
  time: string;
  state: PaymentState;
};

function toPayment(item: ApiPurchase): Payment {
  const state: PaymentState = item.status === "ACCEPTED" ? "accepted" : item.status === "REFUNDED" ? "refunded" : "pending";
  return {
    id: item.id,
    title: item.productName,
    detail: `결제 · ${state === "pending" ? "판매자 확인 대기" : state === "accepted" ? "판매 수락" : "환불 완료"}`,
    original: `${item.unitPrice.toLocaleString()}원`,
    price: `${item.totalAmount.toLocaleString()}원`,
    remaining: "",
    quantity: item.quantity,
    buyerNickname: item.buyerNickname ?? "구매자",
    time: new Date(item.requestedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    state,
  };
}

export function SellerHomeScreen({
  onBuyerMode,
  onLogout,
  onWithdraw,
}: {
  onBuyerMode: () => void;
  onLogout?: () => Promise<void>;
  onWithdraw?: () => Promise<void>;
}) {
  const [page, setPage] = useState<SellerPage>("dashboard");
  const [items, setItems] = useState<Payment[]>([]);
  const [dashboard, setDashboard] = useState({
    dailyRevenue: 0,
    periodRevenue: 0,
    registeredProductCount: 0,
    paymentCounts: { pending: 0, accepted: 0, refunded: 0 },
  });
  const today = dateKey(new Date());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [value, payments, report] = await Promise.all([
        sellerApi.dashboard(today),
        sellerApi.payments({ date: today, size: 50 }),
        endDate
          ? sellerApi.salesReport({ startDate, endDate })
          : Promise.resolve(null),
      ]);
      setDashboard({
        ...value,
        periodRevenue: report?.totalRevenue ?? value.dailyRevenue,
      });
      setItems(payments.content.map(toPayment));
    } catch {
      // 다음 주기 또는 사용자 액션 후 다시 조회한다.
    }
  }, [today, startDate, endDate]);
  useEffect(() => {
    void refresh();
    if (page !== "dashboard" && page !== "payments") return;
    const interval = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(interval);
  }, [page, refresh]);
  if (page === "payments")
    return (
      <PaymentStatus
        items={items}
        setItems={setItems}
        onBack={() => setPage("dashboard")}
        onChanged={refresh}
      />
    );
  if (page === "products")
    return (
      <View style={s.root}>
        <ProductRegistrationScreen onBack={() => setPage("dashboard")} />
        <SellerNavigation
          active="products"
          onHome={() => setPage("dashboard")}
          onProducts={() => setPage("products")}
          onAi={() => setPage("ai")}
          onMypage={() => setPage("mypage")}
        />
      </View>
    );
  if (page === "ai")
    return (
      <View style={s.root}>
        <AppHeader />
        <AIRecommendationScreen />
        <SellerNavigation
          active="ai"
          onHome={() => setPage("dashboard")}
          onProducts={() => setPage("products")}
          onAi={() => setPage("ai")}
          onMypage={() => setPage("mypage")}
        />
      </View>
    );
  if (page === "mypage")
    return (
      <SellerMyPageScreen
        onBack={() => setPage("dashboard")}
        onProducts={() => setPage("products")}
        onAi={() => setPage("ai")}
        onBuyerMode={onBuyerMode}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  const counts = dashboard.paymentCounts;
  return (
    <View style={s.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.dashboard} showsVerticalScrollIndicator={false}>
        <Text style={s.dashboardTitle}>판매 · 결제 현황 대시보드</Text>
        <Text style={s.dashboardBody}>
          당일 판매 결과, 결제 현황, 매출 집계를 조회할 수 있어요.
        </Text>
        <Pressable style={s.date} onPress={() => setRangeOpen(true)}>
          <CalendarIcon width={24} height={24} color={colors.g400} />
          <Text style={s.dateText}>{displayDate(startDate)}</Text>
          <Text style={s.dateDash}>-</Text>
          <Text style={[s.dateText, !endDate && s.datePlaceholder]}>{displayDate(endDate)}</Text>
          <ChevronDown width={24} height={24} color={colors.g400} />
        </Pressable>
        <Pressable
          style={s.dashboardCard}
          onPress={() => setPage("payments")}
        >
          <View style={s.cardTop}>
            <Text style={s.cardLabel}>결제 상태 현황</Text>
            <ChevronRight width={24} height={24} color={colors.g500} />
          </View>
          <View style={s.tags}>
            <CountTag
              label="확인 대기"
              value={counts.pending}
              color={colors.primary500}
            />
            <CountTag
              label="수락"
              value={counts.accepted}
              color={colors.success}
            />
            <CountTag label="환불" value={counts.refunded} color={colors.info} />
          </View>
          <View style={s.bar}>
            <View
              style={[
                s.barPart,
                {
                  flex: counts.pending || 1,
                  backgroundColor: colors.primary500,
                },
              ]}
            />
            <View
              style={[
                s.barPart,
                {
                  flex: counts.accepted || 1,
                  backgroundColor: colors.success,
                },
              ]}
            />
            <View
              style={[
                s.barPart,
                { flex: counts.refunded || 1, backgroundColor: colors.info },
              ]}
            />
          </View>
        </Pressable>
        <Metric
          label="당일 매출 집계 · 리포트"
          value={`${dashboard.dailyRevenue.toLocaleString()}원`}
          startDate={today}
          endDate={today}
          arrow
        />
        <Metric
          label="기간 매출 집계 · 판매 내역"
          value={`${dashboard.periodRevenue.toLocaleString()}원`}
          startDate={startDate}
          endDate={endDate ?? undefined}
          totalRevenue={dashboard.periodRevenue}
          history
          arrow
          onPress={() => setRangeOpen(true)}
        />
        <Metric
          label="등록 상품/자원 수"
          value={`${dashboard.registeredProductCount}개`}
          arrow
        />
      </ScrollView>
      <DateRangeSheet
        visible={rangeOpen}
        initialStart={startDate}
        initialEnd={endDate}
        onClose={() => setRangeOpen(false)}
        onApply={async (start, end) => {
          const report = await sellerApi.salesReport({ startDate: start, endDate: end });
          setStartDate(start);
          setEndDate(end);
          setDashboard((value) => ({ ...value, periodRevenue: report.totalRevenue }));
          setRangeOpen(false);
        }}
      />
      <SellerNavigation
        active="home"
        onHome={() => setPage("dashboard")}
        onProducts={() => setPage("products")}
        onAi={() => setPage("ai")}
        onMypage={() => setPage("mypage")}
      />
    </View>
  );
}

function DateRangeSheet({
  visible,
  initialStart,
  initialEnd,
  onClose,
  onApply,
}: {
  visible: boolean;
  initialStart: string;
  initialEnd: string | null;
  onClose: () => void;
  onApply: (start: string, end: string) => Promise<void>;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState<string | null>(initialEnd);
  const [month, setMonth] = useState(() => {
    const value = new Date(`${initialStart}T00:00:00`);
    return new Date(value.getFullYear(), value.getMonth(), 1);
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStart(initialStart);
    setEnd(initialEnd);
    const value = new Date(`${initialStart}T00:00:00`);
    setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, initialStart, initialEnd]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousLastDate = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1) return { day: previousLastDate + day, current: false };
    if (day > lastDate) return { day: day - lastDate, current: false };
    return { day, current: true };
  });
  const choose = (value: string) => {
    if (!start || end || value < start) {
      setStart(value);
      setEnd(null);
    } else {
      setEnd(value);
    }
  };
  const apply = async () => {
    if (!end || loading) return;
    setLoading(true);
    try {
      await onApply(start, end);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.calendarOverlay} onPress={onClose}>
        <Pressable style={s.calendarSheet} onPress={() => undefined}>
          <View style={s.calendarHandle} />
          <View style={s.calendarRange}>
            <CalendarIcon width={24} height={24} color={colors.g400} />
            <Text style={s.calendarRangeText}>{displayDate(start)}</Text>
            <Text style={s.dateDash}>-</Text>
            <Text style={[s.calendarRangeText, !end && s.datePlaceholder]}>{displayDate(end)}</Text>
            <ChevronDown width={24} height={24} color={colors.g400} />
          </View>
          <View style={s.calendarMonthRow}>
            <Pressable hitSlop={12} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft width={24} height={24} color={colors.black} />
            </Pressable>
            <Text style={s.calendarMonth}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text>
            <Pressable hitSlop={12} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight width={24} height={24} color={colors.black} />
            </Pressable>
          </View>
          <View style={s.calendarWeek}>
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => <Text key={day} style={s.calendarWeekText}>{day}</Text>)}
          </View>
          <View style={s.calendarDays}>
            {cells.map((cell, index) => {
              const value = cell.current ? dateKey(new Date(month.getFullYear(), month.getMonth(), cell.day)) : "";
              const selected = cell.current && (value === start || value === end);
              const between = cell.current && !!end && value > start && value < end;
              const startsRange = value === start && !!end;
              const endsRange = value === end;
              return (
                <Pressable key={`${cell.day}-${index}`} disabled={!cell.current} onPress={() => choose(value)} style={s.calendarDay}>
                  {between ? <View style={s.calendarRangeFill} /> : null}
                  {startsRange ? <View style={s.calendarRangeStart} /> : null}
                  {endsRange ? <View style={s.calendarRangeEnd} /> : null}
                  <View style={[s.calendarDayCircle, selected && s.calendarDaySelected]}>
                    <Text style={[s.calendarDayText, !cell.current && s.calendarOutside, selected && s.calendarDaySelectedText]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={!end || loading} onPress={apply} style={[s.calendarApply, (!end || loading) && s.calendarApplyDisabled]}>
            <Text style={[s.calendarApplyText, (!end || loading) && s.calendarApplyTextDisabled]}>{loading ? "조회 중..." : "조회하기"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PaymentStatus({
  items,
  setItems,
  onBack,
  onChanged,
}: {
  items: Payment[];
  setItems: React.Dispatch<React.SetStateAction<Payment[]>>;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [reject, setReject] = useState<number | null>(null);
  const groups: [PaymentState, string, string, string][] = [
    ["pending", "판매자 확인 대기", "확인 대기 중인 결제가 없어요.", colors.primary500],
    ["accepted", "결제 수락", "수락한 결제가 없어요.", colors.success],
    ["refunded", "환불 완료", "환불한 결제가 없어요.", colors.info],
  ];
  const accept = async (id: number) => {
    await sellerApi.acceptPayment(id);
    const state: PaymentState = "accepted";
    setItems((v) => v.map((x) => (x.id === id ? { ...x, state } : x)));
    await onChanged();
  };
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack}>
          <ChevronLeft width={24} height={24} color={colors.black} />
        </Pressable>
        <Text style={s.headerTitle}>결제 상태 현황</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.statusContent} showsVerticalScrollIndicator={false}>
        {groups.map(([state, title, empty, color]) => {
          const list = items.filter((x) => x.state === state);
          return (
            <View key={state} style={s.group}>
              <View style={s.groupTitle}>
                <Text style={s.groupTitleText}>{title}</Text>
                <CountTag value={list.length} color={color} />
              </View>
              {list.length === 0 ? (
                <Text style={s.empty}>{empty}</Text>
              ) : (
                list.map((x) => (
                  <SellerPaymentCard
                    key={x.id}
                    item={x}
                    onAccept={() => accept(x.id)}
                    onReject={() => setReject(x.id)}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>
      <RejectModal
        visible={reject !== null}
        onClose={() => setReject(null)}
        onConfirm={async (reason) => {
          if (reject !== null) {
            const paymentId = reject;
            await sellerApi.rejectPayment(paymentId, {
              reasonCode: "OTHER",
              reason,
            });
            setItems((v) => v.map((x) => x.id === paymentId ? { ...x, state: "refunded" } : x));
            await onChanged();
          }
          setReject(null);
        }}
      />
    </View>
  );
}

function SellerPaymentCard({
  item,
  onAccept,
  onReject,
}: {
  item: Payment;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={s.resCard}>
      <Text style={s.resTitle}>{item.title}</Text>
      <Text style={s.resDetail}>{item.detail}</Text>
      {item.price ? (
        <>
          <View style={s.priceRow}>
            <Text style={s.original}>{item.original}</Text>
            <Text style={s.price}>{item.price}</Text>
          </View>
          <Text style={s.remaining}>{item.remaining}</Text>
        </>
      ) : null}
      <View style={s.bookingInfo}>
        <Text style={s.infoLabel}>
          구매자 <Text style={s.infoValue}>{item.buyerNickname}</Text>
        </Text>
        <Text style={s.infoLabel}>
          결제 시각 <Text style={s.infoValue}>{item.time}</Text>
        </Text>
        <Text style={s.infoLabel}>구매 수량 <Text style={s.infoValue}>{item.quantity}개</Text></Text>
      </View>
      {item.state === "pending" ? (
        <View style={s.buttons}>
          <SmallButton label="결제 수락" onPress={onAccept} />
          <SmallButton label="거절 · 환불" muted onPress={onReject} />
        </View>
      ) : null}
    </View>
  );
}

function RejectModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("당일 재고 소진");
  const [custom, setCustom] = useState("");
  const reasons = [
    "당일 재고 소진",
    "객실/잔여석 마감",
    "영업 조기 종료 / 브레이크 타임",
    "기타 (직접 입력)",
  ];
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.reject}>
          <View style={s.rejectHead}>
            <Text style={s.rejectTitle}>결제 거절 및 환불 사유를 알려주세요.</Text>
            <Pressable onPress={onClose}>
              <CloseIcon width={24} height={24} color={colors.g500} />
            </Pressable>
          </View>
          {reasons.map((x) => (
            <Pressable key={x} style={s.reasonRow} onPress={() => setReason(x)}>
              <View style={[s.radio, reason === x && s.radioOn]}>
                {reason === x ? <View style={s.radioDot} /> : null}
              </View>
              <Text style={s.reasonText}>{x}</Text>
            </Pressable>
          ))}
          {reason === "기타 (직접 입력)" ? (
            <View>
              <TextInput
                value={custom}
                onChangeText={(v) => setCustom(v.slice(0, 50))}
                placeholder="사유를 입력하세요"
                style={s.reasonInput}
              />
              <Text style={s.counter}>{custom.length}/50</Text>
            </View>
          ) : null}
          <Pressable style={s.rejectButton} onPress={() => onConfirm(reason === "기타 (직접 입력)" ? custom.trim() : reason)}>
            <Text style={s.buttonText}>거절하고 환불하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function CountTag({
  label,
  value,
  color,
}: {
  label?: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={[
        s.countTag,
        { borderColor: color, backgroundColor: `${color}20` },
      ]}
    >
      <Text style={[s.countText, { color }]}>
        {label}
        {label ? " " : ""}
        {value}
      </Text>
    </View>
  );
}
function Metric({
  label,
  value,
  arrow,
  startDate,
  endDate,
  totalRevenue,
  history,
  onPress,
}: {
  label: string;
  value: string;
  arrow?: boolean;
  startDate?:string;
  endDate?:string;
  totalRevenue?: number;
  history?: boolean;
  onPress?: () => void;
}) {
  const [report, setReport] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const isDailySales = label.includes("당일 매출");
  const isRegistered = label.includes("등록 상품");
  return (
    <>
      <Pressable
        disabled={!history && !onPress && !isDailySales && !isRegistered}
        onPress={() => {
          if (history) {
            if (!startDate || !endDate) onPress?.();
            else setHistoryOpen(true);
          } else if (onPress) onPress();
          else if (isDailySales) setReport(true);
          else setRegistered(true);
        }}
        style={s.metric}
      >
        <View>
          <Text style={s.metricLabel}>{label}</Text>
          <Text style={s.metricValue}>{value}</Text>
        </View>
        {arrow ? (
          <ChevronRight width={24} height={24} color={colors.g500} />
        ) : null}
      </Pressable>
      <Modal
        visible={report}
        animationType="slide"
        onRequestClose={() => setReport(false)}
      >
        <DeviceFrame>
          <SalesReportScreen startDate={startDate} endDate={endDate} onBack={() => setReport(false)} />
        </DeviceFrame>
      </Modal>
      <Modal
        visible={registered}
        animationType="slide"
        onRequestClose={() => setRegistered(false)}
      >
        <DeviceFrame>
          <RegisteredProductsScreen onBack={() => setRegistered(false)} />
        </DeviceFrame>
      </Modal>
      <Modal
        visible={historyOpen}
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <DeviceFrame>
          {startDate && endDate ? (
            <SalesHistoryScreen
              startDate={startDate}
              endDate={endDate}
              totalRevenue={totalRevenue ?? 0}
              onBack={() => setHistoryOpen(false)}
            />
          ) : null}
        </DeviceFrame>
      </Modal>
    </>
  );
}
function SmallButton({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      style={[s.smallButton, muted ? s.gray : s.orange]}
      onPress={onPress}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
function SellerNavigation({
  active,
  onHome,
  onProducts,
  onAi,
  onMypage,
}: {
  active: "home" | "products" | "ai" | "mypage";
  onHome: () => void;
  onProducts?: () => void;
  onAi?: () => void;
  onMypage?: () => void;
}) {
  const tabs = [
    ["홈", HomeIcon, onHome],
    ["상품등록", ShoppingIcon, onProducts ?? (() => {})],
    ["AI추천가", TrelloIcon, onAi ?? (() => {})],
    ["마이페이지", UserIcon, onMypage ?? (() => {})],
  ] as const;
  return (
    <View style={s.nav}>
      {tabs.map(([label, Icon, onPress], i) => {
        const selected =
          (active === "home" && i === 0) ||
          (active === "products" && i === 1) ||
          (active === "ai" && i === 2) ||
          (active === "mypage" && i === 3);
        const color = selected ? colors.primary500 : colors.g400;
        return (
          <Pressable key={label} style={s.navItem} onPress={onPress}>
            <Icon width={24} height={24} color={color} />
            <Text style={[s.navLabel, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  dashboard: { padding: 16, paddingBottom: 92 },
  dashboardTitle: { fontSize: 20, fontWeight: "600", marginBottom: 4 },
  dashboardBody: { fontSize: 14, color: colors.g500, marginBottom: 16 },
  date: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 26,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateText: { flex: 1, fontSize: 16, color: colors.black },
  dateDash: { fontSize: 16, color: colors.g400 },
  datePlaceholder: { color: colors.g400 },
  dashboardCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(230,230,229,.5)",
    gap: 12,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontSize: 14 },
  tags: { flexDirection: "row", gap: 8 },
  countTag: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  countText: { fontSize: 14, fontWeight: "600" },
  bar: {
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  barPart: { height: "100%" },
  metric: {
    height: 84,
    marginTop: 12,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: "rgba(230,230,229,.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLabel: { fontSize: 14 },
  metricValue: { fontSize: 20, fontWeight: "500", marginTop: 8 },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  statusContent: { paddingHorizontal: 16, paddingBottom: 24 },
  group: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    gap: 12,
  },
  groupTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupTitleText: { fontSize: 18, fontWeight: "600" },
  empty: {
    height: 60,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    color: colors.g500,
  },
  resCard: {
    borderWidth: 1,
    borderColor: colors.g300,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },
  resTitle: { fontSize: 20, fontWeight: "600" },
  resDetail: { fontSize: 12, color: colors.g600 },
  priceRow: { flexDirection: "row", justifyContent: "space-between" },
  original: {
    fontSize: 16,
    color: colors.g800,
    textDecorationLine: "line-through",
  },
  price: { fontSize: 20, fontWeight: "600", color: colors.danger },
  remaining: { fontSize: 12, color: colors.g600 },
  bookingInfo: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.g200,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: { fontSize: 14, fontWeight: "500" },
  infoValue: { fontSize: 12, fontWeight: "400", color: colors.g600 },
  buttons: { flexDirection: "row", gap: 16, marginTop: 8 },
  smallButton: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  orange: { backgroundColor: colors.primary500 },
  gray: { backgroundColor: colors.g300 },
  buttonText: { fontSize: 16, fontWeight: "600", color: colors.white },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 66,
    borderTopWidth: 1,
    borderTopColor: colors.g200,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: "row",
  },
  navItem: { flex: 1, paddingVertical: 8, alignItems: "center", gap: 8 },
  navLabel: { fontSize: 12, fontWeight: "600" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,.25)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  reject: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: 20,
    gap: 14,
  },
  rejectHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rejectTitle: { fontSize: 18, fontWeight: "600" },
  reasonRow: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 6,
    borderColor: colors.g300,
  },
  radioOn: { borderColor: colors.primary500 },
  radioDot: { flex: 1 },
  reasonText: { fontSize: 16 },
  reasonInput: {
    height: 48,
    marginLeft: 34,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary500,
    paddingHorizontal: 0,
    fontSize: 14,
  },
  counter: { fontSize: 10, color: colors.g500, textAlign: "right" },
  rejectButton: {
    height: 56,
    marginTop: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary500,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,.25)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  calendarSheet: {
    width: "100%",
    maxWidth: 402,
    height: 588,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  calendarHandle: {
    width: 60,
    height: 4,
    marginBottom: 40,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: colors.g200,
  },
  calendarRange: {
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calendarRangeText: { flex: 1, fontSize: 16, color: colors.black },
  calendarMonthRow: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarMonth: { fontSize: 16, fontWeight: "600", color: colors.black },
  calendarWeek: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.g300,
    flexDirection: "row",
    alignItems: "center",
  },
  calendarWeekText: { width: "14.285%", fontSize: 12, color: colors.g300, textAlign: "center" },
  calendarDays: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.285%", height: 44, alignItems: "center", justifyContent: "center", position: "relative" },
  calendarRangeFill: { position: "absolute", left: 0, right: 0, top: 8, bottom: 8, backgroundColor: "#ffdc9b" },
  calendarRangeStart: { position: "absolute", left: "50%", right: 0, top: 8, bottom: 8, backgroundColor: "#ffdc9b" },
  calendarRangeEnd: { position: "absolute", left: 0, right: "50%", top: 8, bottom: 8, backgroundColor: "#ffdc9b" },
  calendarDayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", zIndex: 1 },
  calendarDaySelected: { backgroundColor: colors.primary500 },
  calendarDayText: { fontSize: 14, color: colors.g800 },
  calendarOutside: { color: colors.g300 },
  calendarDaySelectedText: { color: colors.white, fontWeight: "600" },
  calendarApply: { height: 56, marginTop: 20, borderRadius: radius.md, backgroundColor: colors.primary500, alignItems: "center", justifyContent: "center" },
  calendarApplyDisabled: { backgroundColor: colors.g200 },
  calendarApplyText: { fontSize: 16, fontWeight: "600", color: colors.white },
  calendarApplyTextDisabled: { color: colors.g400 },
});
