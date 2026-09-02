import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { AppHeader as BaseAppHeader, floatingNavigationStyles } from "../components/home";
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
import CoinsIcon from "../../icon/coins.svg";
import PeriodSalesIcon from "../../icon/period_sales.svg";
import BoxIcon from "../../icon/box.svg";
import { CachedSellerDashboard, SELLER_DASHBOARD_CACHE_KEY, readCache, readWebCache, writeCache } from "../cache/appCache";
import { ScreenTransition } from "../components/ScreenTransition";

const BarChartIcon = ({ color = "#767676", width = 16, height = 16 }: { color?: string; width?: number; height?: number }) => (
  <Svg width={width} height={height} viewBox="0 0 16 16" fill="none">
    <Path d="M2 13V9H4.5V13H2ZM6.75 13V3H9.25V13H6.75ZM11.5 13V6H14V13H11.5Z" fill={color} />
  </Svg>
);

const LineChartIcon = ({ color = "#767676", width = 16, height = 16 }: { color?: string; width?: number; height?: number }) => (
  <Svg width={width} height={height} viewBox="0 0 16 16" fill="none">
    <Path d="M2 12L6 7.5L9.5 10L14 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="14" cy="3.5" r="1.5" fill={color} />
  </Svg>
);

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
    time: new Date(item.requestedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }),
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
  const [pageDirection,setPageDirection]=useState<-1|1>(1);
  const [myPageRoot,setMyPageRoot]=useState(true);
  const [items, setItems] = useState<Payment[]>([]);
  const today = dateKey(new Date());
  const cachedDashboard = readWebCache<CachedSellerDashboard>(SELLER_DASHBOARD_CACHE_KEY);
  const initialDashboard = cachedDashboard?.date === today ? cachedDashboard : null;
  const [dashboard, setDashboard] = useState({
    dailyRevenue: initialDashboard?.dailyRevenue ?? 0,
    periodRevenue: initialDashboard?.periodRevenue ?? 0,
    registeredProductCount: initialDashboard?.registeredProductCount ?? 0,
    paymentCounts: initialDashboard?.paymentCounts ?? { pending: 0, accepted: 0, refunded: 0 },
  });
  const [lastWeekRevenue, setLastWeekRevenue] = useState(0);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState<string | null>(null);
  const lastBackPress = useRef(0);
  const navigate=(next:SellerPage,direction?:-1|1)=>{
    if(next===page)return;
    const order={dashboard:0,payments:1,products:1,ai:2,mypage:3};
    setPageDirection(direction??(order[next]>order[page]?1:-1));
    setPage(next);
  };

  useEffect(() => {
    const onBackPress = () => {
      // 1. 날짜 범위 선택 모달이 열려있으면 닫기
      if (rangeOpen) {
        setRangeOpen(false);
        return true;
      }

      // 2. 대시보드가 아닌 다른 탭/페이지일 경우 홈 대시보드로 이동
      if (page !== "dashboard") {
        navigate("dashboard", -1);
        return true;
      }

      // 3. 대시보드(홈) 최상단: 2초 내 재입력 시 앱 종료
      const currentTime = Date.now();
      if (lastBackPress.current && currentTime - lastBackPress.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPress.current = currentTime;
      if (Platform.OS === "android") {
        ToastAndroid.show("'뒤로' 버튼을 한 번 더 누르면 종료됩니다.", ToastAndroid.SHORT);
      }
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [page, rangeOpen]);
  const screen=(content:React.ReactNode)=>{
    const tabPage=page!=="payments";
    const chromeVisible=tabPage&&(page!=="mypage"||myPageRoot);
    const active=page==="dashboard"?"home":page;
    return <View style={{flex:1,overflow:"hidden"}}>
      <ScreenTransition screenKey={page} direction={pageDirection}>{content}</ScreenTransition>
      {chromeVisible?<View style={{position:"absolute",left:0,right:0,top:0,zIndex:20,backgroundColor:colors.white}}><AppHeader/></View>:null}
      {chromeVisible?<View style={{position:"absolute",left:0,right:0,bottom:0,zIndex:20,height:104}}><SellerNavigation active={active as "home"|"products"|"ai"|"mypage"} onHome={()=>navigate("dashboard")} onProducts={()=>navigate("products")} onAi={()=>navigate("ai")} onMypage={()=>navigate("mypage")}/></View>:null}
    </View>;
  };
  const [dailySalesMap, setDailySalesMap] = useState<Record<string, number>>({});
  const lastWeekDate = dateKey(new Date(new Date(today + 'T00:00:00').getTime() - 7 * 24 * 60 * 60 * 1000));
  const refresh = useCallback(async () => {
    try {
      const isCustomDate = !!endDate || startDate !== today;
      const [value, payments, report, historyData, lastWeekReport] = await Promise.all([
        sellerApi.dashboard(today),
        sellerApi.payments({ date: today, size: 50 }),
        isCustomDate
          ? sellerApi.salesReport({ startDate, endDate: endDate ?? startDate })
          : Promise.resolve(null),
        isCustomDate
          ? sellerApi.salesHistory({ startDate, endDate: endDate ?? startDate, size: 100 }).catch(() => null)
          : Promise.resolve(null),
        sellerApi.salesReport({ startDate: lastWeekDate, endDate: lastWeekDate }).catch(() => null),
      ]);
      const acceptedTodayRevenue = payments.content
        .filter((p) => p.status === "ACCEPTED")
        .reduce((sum, p) => sum + p.totalAmount, 0);
      const effectiveDailyRevenue = Math.max(value.dailyRevenue, acceptedTodayRevenue);

      const nextDashboard = {
        ...value,
        dailyRevenue: effectiveDailyRevenue,
        periodRevenue: isCustomDate ? (report?.totalRevenue ?? effectiveDailyRevenue) : effectiveDailyRevenue,
      };
      setDashboard(nextDashboard);
      void writeCache(SELLER_DASHBOARD_CACHE_KEY,nextDashboard);
      setItems(payments.content.map(toPayment));
      setLastWeekRevenue(lastWeekReport?.totalRevenue ?? 0);

      // 실제 일별 매출 맵 집계
      const map: Record<string, number> = {};
      if (historyData?.content && historyData.content.length > 0) {
        historyData.content.forEach((item) => {
          const dateStr = item.soldAt.slice(0, 10);
          map[dateStr] = (map[dateStr] ?? 0) + item.totalAmount;
        });
      } else {
        payments.content.forEach((p) => {
          if (p.status === "ACCEPTED") {
            const dateStr = p.requestedAt ? p.requestedAt.slice(0, 10) : today;
            map[dateStr] = (map[dateStr] ?? 0) + p.totalAmount;
          }
        });
      }
      if (isCustomDate && report?.totalRevenue && Object.keys(map).length === 0) {
        map[startDate] = report.totalRevenue;
      }
      setDailySalesMap(map);
    } catch {
      // 다음 주기 또는 사용자 액션 후 다시 조회한다.
    }
  }, [today, lastWeekDate, startDate, endDate]);
  useEffect(() => {
    if (!initialDashboard) void readCache<CachedSellerDashboard>(SELLER_DASHBOARD_CACHE_KEY).then(value=>{if(value?.date===today)setDashboard(value)});
    void refresh();
    if (page !== "dashboard" && page !== "payments") return;
    const interval = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(interval);
  }, [page, refresh]);
  if (page === "payments")
    return screen(
      <PaymentStatus
        items={items}
        setItems={setItems}
        onBack={() => navigate("dashboard",-1)}
        onChanged={refresh}
      />
    );
  if (page === "products")
    return screen(
      <View style={s.chromeContent}>
        <ProductRegistrationScreen showHeader={false} onBack={() => navigate("dashboard",-1)} onGoToAI={() => navigate("ai")} />
      </View>
    );
  if (page === "ai")
    return screen(
      <View style={s.chromeContent}>
        <AIRecommendationScreen />
      </View>
    );
  if (page === "mypage")
    return screen(
      <SellerMyPageScreen
        onBack={() => navigate("dashboard")}
        onProducts={() => navigate("products")}
        onAi={() => navigate("ai")}
        onBuyerMode={onBuyerMode}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
        onRootChange={setMyPageRoot}
      />
    );
  // 기본 오늘 화면(달력에서 어떠한 커스텀 날짜/구간도 선택하지 않은 초기 상태)인가?
  const isDefaultToday = !endDate && startDate === today;
  const hasDailySales = dashboard.dailyRevenue > 0;
  const hasPeriodSales = dashboard.periodRevenue > 0;

  // 당일 매출 증감률 딱지 계산 (지난 주 대비)
  let dailyTrendText: string = "-";
  let dailyTrendColor: string = "#989792"; // 지난 주 0원 시 회색 '-'
  if (lastWeekRevenue > 0) {
    const pct = ((dashboard.dailyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
    if (pct > 0) {
      dailyTrendText = `+${pct.toFixed(1)}%`;
      dailyTrendColor = "#52D162"; // 상승: 초록색
    } else if (pct < 0) {
      dailyTrendText = `${pct.toFixed(1)}%`;
      dailyTrendColor = "#EB4031"; // 하락: 빨간색
    } else {
      dailyTrendText = "0.0%";
      dailyTrendColor = "#989792"; // 동일: 회색
    }
  }

  return screen(
    <View style={s.chromeContent}>
      <ScrollView contentContainerStyle={s.dashboard} showsVerticalScrollIndicator={false}>
        {/* 타이틀 */}
        <Text style={s.dashboardTitle}>판매 · 결제 현황</Text>

        {/* 날짜 선택 (단일 날짜 / 기간 선택) */}
        <Pressable style={s.date} onPress={() => setRangeOpen(true)}>
          <CalendarIcon width={24} height={24} color={colors.g400} />
          <Text style={s.dateText}>
            {displayDate(startDate)}{endDate && endDate !== startDate ? ` - ${displayDate(endDate)}` : ""}
          </Text>
          <ChevronDown width={24} height={24} color={colors.g400} />
        </Pressable>

        {/* 결제 수락 · 현황 관리 카드 (상단 배치) */}
        <View style={s.paymentManageCard}>
          <View style={s.paymentManageHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.paymentManageTitle}>결제 수락 · 현황 관리</Text>
              <Text style={s.paymentManageSub}>
                {dashboard.paymentCounts.pending > 0
                  ? `확인 대기 중인 결제가 ${dashboard.paymentCounts.pending}건 있어요!`
                  : "모든 결제가 처리되었어요."}
              </Text>
            </View>
            <Pressable style={s.paymentManageDetailBtn} onPress={() => navigate("payments")}>
              <Text style={s.paymentManageDetailText}>전체 보기</Text>
              <ChevronRight width={18} height={18} color="#2B2B29" />
            </Pressable>
          </View>

          {/* 상태별 태그 바 */}
          <View style={s.paymentStatusTags}>
            <Pressable style={[s.paymentStatusPill, { backgroundColor: "rgba(255,197,84,0.2)" }]} onPress={() => navigate("payments")}>
              <View style={[s.paymentStatusDot, { backgroundColor: "#FFB020" }]} />
              <Text style={[s.paymentStatusPillText, { color: "#B87500" }]}>대기 {dashboard.paymentCounts.pending}</Text>
            </Pressable>
            <Pressable style={[s.paymentStatusPill, { backgroundColor: "rgba(82,209,98,0.15)" }]} onPress={() => navigate("payments")}>
              <View style={[s.paymentStatusDot, { backgroundColor: "#52D162" }]} />
              <Text style={[s.paymentStatusPillText, { color: "#298634" }]}>수락 {dashboard.paymentCounts.accepted}</Text>
            </Pressable>
            <Pressable style={[s.paymentStatusPill, { backgroundColor: "rgba(235,64,49,0.15)" }]} onPress={() => navigate("payments")}>
              <View style={[s.paymentStatusDot, { backgroundColor: "#EB4031" }]} />
              <Text style={[s.paymentStatusPillText, { color: "#B32517" }]}>환불 {dashboard.paymentCounts.refunded}</Text>
            </Pressable>
          </View>

          {/* 대기 중인 결제 빠른 수락 액션 */}
          {items.filter(x => x.state === "pending").length > 0 ? (
            <View style={s.quickPaymentCard}>
              <View style={s.quickPaymentTop}>
                <Text numberOfLines={1} style={s.quickPaymentTitle}>
                  {items.filter(x => x.state === "pending")[0].title}
                </Text>
                <Text style={s.quickPaymentTime}>
                  {items.filter(x => x.state === "pending")[0].time}
                </Text>
              </View>
              <Text style={s.quickPaymentMeta}>
                구매자: {items.filter(x => x.state === "pending")[0].buyerNickname} · {items.filter(x => x.state === "pending")[0].quantity}개 ({items.filter(x => x.state === "pending")[0].price})
              </Text>
              <View style={s.quickPaymentButtons}>
                <Pressable
                  style={s.quickAcceptBtn}
                  onPress={async () => {
                    const targetId = items.filter(x => x.state === "pending")[0].id;
                    await sellerApi.acceptPayment(targetId);
                    setItems(v => v.map(x => x.id === targetId ? { ...x, state: "accepted" as PaymentState } : x));
                    await refresh();
                  }}
                >
                  <Text style={s.quickAcceptBtnText}>결제 수락</Text>
                </Pressable>
                <Pressable
                  style={s.quickRejectBtn}
                  onPress={() => navigate("payments")}
                >
                  <Text style={s.quickRejectBtnText}>거절 · 환불</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* 기본 오늘 접속 시: 지난 주 / 이번 주 범례 표시
            커스텀 날짜/구간 선택 시: 막대 / 선 아이콘 토글 스위치 표시 */}
        {isDefaultToday ? (
          <View style={s.chartLegend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#E6E6E5" }]} />
              <Text style={s.legendText}>지난 주</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#FFC554" }]} />
              <Text style={s.legendText}>이번 주</Text>
            </View>
          </View>
        ) : (
          <View style={s.chartTypeToggleRowIconOnly}>
            <Pressable
              style={[s.chartTypeBtnIcon, chartType === "bar" && s.chartTypeBtnIconActive]}
              onPress={() => setChartType("bar")}
            >
              <BarChartIcon width={16} height={16} color={chartType === "bar" ? "#111111" : "#767676"} />
            </Pressable>

            <Pressable
              style={[s.chartTypeBtnIcon, chartType === "line" && s.chartTypeBtnIconActive]}
              onPress={() => setChartType("line")}
            >
              <LineChartIcon width={16} height={16} color={chartType === "line" ? "#111111" : "#767676"} />
            </Pressable>
          </View>
        )}

        {/* 기본 오늘 접속 시: 회색(지난 주)/주황색(오늘) 바 차트 렌더링
            커스텀 날짜/구간 선택 시: 구간 그래프 (막대/선 선택적 렌더링) */}
        {isDefaultToday ? (
          <RevenueBarChart
            thisWeek={dashboard.dailyRevenue}
            lastWeek={lastWeekRevenue}
            isSingleDay={true}
            startDate={startDate}
            endDate={endDate}
            salesByDate={dailySalesMap}
          />
        ) : chartType === "bar" ? (
          <RevenueBarChart
            thisWeek={dashboard.dailyRevenue}
            lastWeek={lastWeekRevenue}
            isSingleDay={false}
            startDate={startDate}
            endDate={endDate}
            salesByDate={dailySalesMap}
          />
        ) : (
          <RevenueLineChart
            thisWeek={dashboard.dailyRevenue}
            lastWeek={lastWeekRevenue}
            isSingleDay={false}
            startDate={startDate}
            endDate={endDate}
            salesByDate={dailySalesMap}
          />
        )}

        {/* 요약 카드 3개 */}
        <View style={s.summaryCards}>
          <SummaryCard
            label="당일 매출 · 정산 금액"
            value={`${dashboard.dailyRevenue.toLocaleString()}원`}
            cardBg={isDefaultToday && (hasDailySales || lastWeekRevenue > 0) ? "#FFF3DC" : "#F2F2F1"}
            trend={dailyTrendText}
            trendColor={dailyTrendColor}
            muted={!hasDailySales && lastWeekRevenue === 0}
            iconType="coins"
            onPress={() => {}}
            startDate={today}
            endDate={today}
            onReturn={refresh}
          />
          <SummaryCard
            label="기간 매출 집계"
            value={!isDefaultToday ? `${dashboard.periodRevenue.toLocaleString()}원` : "0원"}
            cardBg={!isDefaultToday ? "#FFF3DC" : "#F2F2F1"}
            muted={isDefaultToday || !hasPeriodSales}
            iconType="period"
            onPress={() => setRangeOpen(true)}
            startDate={startDate}
            endDate={endDate ?? undefined}
            totalRevenue={dashboard.periodRevenue}
            isHistory
            onReturn={refresh}
          />
          <SummaryCard
            label="등록 상품 · 자원 수"
            value={`${dashboard.registeredProductCount}개`}
            cardBg="#F2F2F1"
            iconType="box"
            onPress={() => {}}
            onReturn={refresh}
            isRegistered
          />
        </View>
      </ScrollView>
      <DateRangeSheet
        visible={rangeOpen}
        initialStart={startDate}
        initialEnd={endDate}
        onClose={() => setRangeOpen(false)}
        onApply={async (start, end) => {
          try {
            const report = await sellerApi.salesReport({ startDate: start, endDate: end }).catch(() => null);
            setStartDate(start);
            setEndDate(end);
            if (report) {
              setDashboard((value) => ({ ...value, periodRevenue: report.totalRevenue }));
            }
          } catch {
            setStartDate(start);
            setEndDate(end);
          } finally {
            setRangeOpen(false);
          }
        }}
      />
      <Modal
        visible={historyModalOpen}
        animationType="slide"
        onRequestClose={() => { setHistoryModalOpen(false); void refresh(); }}
      >
        <DeviceFrame>
          <SalesHistoryScreen
            startDate={startDate}
            endDate={endDate ?? startDate}
            totalRevenue={dashboard.periodRevenue}
            onBack={() => { setHistoryModalOpen(false); void refresh(); }}
          />
        </DeviceFrame>
      </Modal>
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
              const hasDateRange = !!end && end !== start;
              const between = cell.current && hasDateRange && value > start && value < end;
              const startsRange = hasDateRange && value === start;
              const endsRange = hasDateRange && value === end;
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
      <View style={s.resCardHeader}>
        <Text style={s.resTitle}>{item.title}</Text>
        <Text style={s.resTime}>{item.time}</Text>
      </View>
      <Text style={s.resDetail}>{item.detail}</Text>
      {item.price ? (
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>결제 금액</Text>
          <Text style={s.price}>{item.price}</Text>
        </View>
      ) : null}
      <View style={s.bookingInfo}>
        <Text style={s.infoLabel}>
          구매자 <Text style={s.infoValue}>{item.buyerNickname}</Text>
        </Text>
        <Text style={s.infoLabel}>
          구매 수량 <Text style={s.infoValue}>{item.quantity}개</Text>
        </Text>
      </View>
      {item.state === "pending" ? (
        <View style={s.buttons}>
          <Pressable style={s.paymentAcceptBtn} onPress={onAccept}>
            <Text style={s.paymentAcceptBtnText}>결제 수락</Text>
          </Pressable>
          <Pressable style={s.paymentRejectBtn} onPress={onReject}>
            <Text style={s.paymentRejectBtnText}>거절 · 환불</Text>
          </Pressable>
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
function getMMDD(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}.${day}`;
}

function getPrevWeekMMDD(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - 7);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}.${day}`;
}

function generateMultiDayData(
  startStr?: string,
  endStr?: string,
  salesByDate?: Record<string, number>
) {
  if (!startStr) return [];

  const list: { date: string; revenue: number; label: string }[] = [];
  const curr = new Date(`${startStr}T00:00:00`);
  const last = new Date(`${(endStr ?? startStr)}T00:00:00`);

  if (isNaN(curr.getTime())) return [];

  let count = 0;
  while (curr <= last && count < 31) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    const fullDateKey = `${y}-${m}-${d}`;
    const dateLabel = `${m}.${d}`;

    // 💡 실제 백엔드/결제 내역에 기록된 일별 매출 반영 (없으면 0원)
    const rev = salesByDate?.[fullDateKey] ?? 0;

    list.push({
      date: dateLabel,
      revenue: rev,
      label: `${rev.toLocaleString()}원`,
    });

    curr.setDate(curr.getDate() + 1);
    count++;
  }

  return list;
}

function RevenueBarChart({
  thisWeek,
  lastWeek,
  isSingleDay = true,
  startDate,
  endDate,
  salesByDate,
}: {
  thisWeek: number;
  lastWeek: number;
  isSingleDay?: boolean;
  startDate?: string;
  endDate?: string | null;
  salesByDate?: Record<string, number>;
}) {
  const BAR_MAX_H = 160; // px — usable bar height
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const fmt = (v: number) => (v >= 10000 ? `${Math.round(v / 10000)}만원` : `${v.toLocaleString()}원`);

  if (isSingleDay) {
    const isEmpty = thisWeek === 0 && lastWeek === 0;
    if (isEmpty) {
      return (
        <View style={s.chartArea}>
          <View style={s.chartEmptyWrapper}>
            <Text style={s.chartEmpty}>조회하신 기간의 매출 데이터가 없어요.</Text>
          </View>
        </View>
      );
    }

    const maxVal = Math.max(thisWeek, lastWeek, 1);
    const scale = Math.ceil(maxVal / 100000) * 100000 || 200000;
    const halfScale = scale / 2;
    const lastH = lastWeek > 0 ? Math.max((lastWeek / scale) * BAR_MAX_H, 16) : 6;
    const thisH = thisWeek > 0 ? Math.max((thisWeek / scale) * BAR_MAX_H, 16) : 6;

    const todayStr = dateKey(new Date());
    const isToday = !startDate || startDate === todayStr;
    const prevWeekLabel = startDate ? getPrevWeekMMDD(startDate) : getPrevWeekMMDD(todayStr);
    const thisWeekLabel = isToday ? "오늘" : getMMDD(startDate);

    return (
      <View style={s.chartArea}>
        <View style={s.chartInner}>
          {/* Y축 레이블 (수평 기준선선에 100% 정밀 중앙 정렬) */}
          <View style={s.chartYAxisFixed}>
            <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H + 24 - 6 }]}>{fmt(scale)}</Text>
            <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H / 2 + 24 - 6 }]}>{fmt(halfScale)}</Text>
            <Text style={[s.chartYLabel, { position: "absolute", bottom: 24 - 6 }]}>0</Text>
          </View>
          {/* 차트 본문 */}
          <Pressable style={s.chartBodyFixed} onPress={() => setShowTooltip(v => !v)}>
            {/* 수평 그리드 라인 (기준선) */}
            <View style={[s.gridLineFull, { bottom: BAR_MAX_H + 24 }]} />
            <View style={[s.gridLineFull, { bottom: BAR_MAX_H / 2 + 24 }]} />
            <View style={[s.gridLineFull, { bottom: 24 }]} />

            <View style={s.singleBarWrapper}>
              <View style={s.barsRowItem}>
                {/* 지난 주 (회색 바 + 밑에 월.일) */}
                <View style={s.barColumnItem}>
                  <View style={[s.chartBarSingle, { height: lastH, backgroundColor: "#E6E6E5" }]} />
                  <Text style={s.chartDateLabelSingle}>{prevWeekLabel}</Text>
                </View>

                {/* 이번 주 (주황색 바 + 상단 마커 & 툴팁 + 밑에 '오늘' 또는 월.일) */}
                <View style={s.barColumnItem}>
                  <View style={s.yellowBarWrapper}>
                    {/* 주황색 바 꼭대기 위 툴팁 (누르면 토글) */}
                    {showTooltip ? (
                      <View style={s.chartTooltipOnYellowBar}>
                        <View style={s.tooltipRow}>
                          <View style={[s.tooltipDot, { backgroundColor: "#E6E6E5" }]} />
                          <Text style={s.tooltipText}>{`${lastWeek.toLocaleString()}원`}</Text>
                        </View>
                        <View style={[s.tooltipRow, { marginTop: 6 }]}>
                          <View style={[s.tooltipDot, { backgroundColor: "#FFC554" }]} />
                          <Text style={s.tooltipText}>{`${thisWeek.toLocaleString()}원`}</Text>
                        </View>
                        <View style={s.tooltipArrowCentered} />
                      </View>
                    ) : null}

                    {/* 주황색 바 꼭대기 마커 도트 */}
                    {showTooltip ? (
                      <View style={s.markerDotOnYellowBar}>
                        <View style={s.markerInner} />
                      </View>
                    ) : null}

                    {/* 주황색 바 */}
                    <View style={[s.chartBarSingle, { height: thisH, backgroundColor: "#FFC554" }]} />
                  </View>
                  <Text style={[s.chartDateLabelSingle, { color: colors.black, fontWeight: "600" }]}>{thisWeekLabel}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  // 기간 범위 (다중 날짜) 선택 시 — 모든 날짜를 가로 스크롤 주황색 바 하나로 표기
  const multiDayData = generateMultiDayData(startDate, endDate ?? undefined, salesByDate);
  const maxMultiVal = Math.max(...multiDayData.map(x => x.revenue), 200000);
  const multiScale = Math.ceil(maxMultiVal / 100000) * 100000 || 200000;
  const multiHalfScale = multiScale / 2;

  return (
    <View style={s.chartArea}>
      <View style={s.chartInner}>
        {/* Y축 레이블 (수평 기준선선에 100% 정밀 중앙 정렬) */}
        <View style={s.chartYAxisFixed}>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H + 24 - 6 }]}>{fmt(multiScale)}</Text>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H / 2 + 24 - 6 }]}>{fmt(multiHalfScale)}</Text>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: 24 - 6 }]}>0</Text>
        </View>

        {/* 차트 본문 (가로 스크롤 가능) */}
        <View style={s.chartBodyFixed}>
          {/* 수평 그리드 라인 (기준선) */}
          <View style={[s.gridLineFull, { bottom: BAR_MAX_H + 24 }]} />
          <View style={[s.gridLineFull, { bottom: BAR_MAX_H / 2 + 24 }]} />
          <View style={[s.gridLineFull, { bottom: 24 }]} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.multiBarScrollContainer}
          >
            {multiDayData.map((item, index) => {
              const isSelected = selectedIndex === index;
              const barH = item.revenue > 0 ? Math.max((item.revenue / multiScale) * BAR_MAX_H, 16) : 6;

              return (
                <Pressable
                  key={item.date + index}
                  onPress={() => setSelectedIndex(index)}
                  style={[s.barColumnItemMulti, isSelected && { zIndex: 10 }]}
                >
                  <View style={[s.yellowBarWrapper, isSelected && { zIndex: 10 }]}>
                    {/* 선택된 바 꼭대기 위 툴팁 (첫날/마지막날 잘림 방지 및 날짜/금액 2행 줄바꿈) */}
                    {isSelected ? (
                      <View style={[
                        s.chartTooltipOnYellowBar,
                        index === 0
                          ? { left: -6 }
                          : index === multiDayData.length - 1
                          ? { left: -52 }
                          : { left: -28 }
                      ]}>
                        <View style={s.tooltipRow}>
                          <View style={[s.tooltipDot, { backgroundColor: "#FFC554" }]} />
                          <Text style={s.tooltipText}>{item.date}</Text>
                        </View>
                        <Text numberOfLines={1} style={s.tooltipAmountText}>{item.label}</Text>
                        <View style={[
                          s.tooltipArrowCentered,
                          index === 0
                            ? { left: 22 }
                            : index === multiDayData.length - 1
                            ? { left: 68 }
                            : { left: 44 }
                        ]} />
                      </View>
                    ) : null}

                    {/* 선택된 바 꼭대기 마커 도트 */}
                    {isSelected ? (
                      <View style={s.markerDotOnYellowBar}>
                        <View style={s.markerInner} />
                      </View>
                    ) : null}

                    {/* 주황색 바 (단일 바) */}
                    <View
                      style={[
                        s.chartBarSingle,
                        { height: barH, backgroundColor: "#FFC554" },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      s.chartDateLabelSingle,
                      isSelected && { color: colors.black, fontWeight: "600" },
                    ]}
                  >
                    {item.date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function RevenueLineChart({
  thisWeek,
  lastWeek,
  isSingleDay = false,
  startDate,
  endDate,
  salesByDate,
}: {
  thisWeek: number;
  lastWeek: number;
  isSingleDay?: boolean;
  startDate?: string;
  endDate?: string | null;
  salesByDate?: Record<string, number>;
}) {
  const BAR_MAX_H = 140;
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const multiDayData = generateMultiDayData(startDate, endDate ?? undefined, salesByDate);
  if (multiDayData.length === 0) {
    return (
      <View style={s.chartArea}>
        <View style={s.chartEmptyWrapper}>
          <Text style={s.chartEmpty}>조회하신 기간의 매출 데이터가 없어요.</Text>
        </View>
      </View>
    );
  }
  const maxMultiVal = Math.max(...multiDayData.map(x => x.revenue), 100000);

  // 💡 1.4배 헤드룸 버퍼를 반영하여 Y축 스케일을 여유있게 결정 (최고점 툴팁 잘림 완전 방지)
  const multiScale = Math.ceil((maxMultiVal * 1.4) / 100000) * 100000 || 300000;
  const multiHalfScale = multiScale / 2;
  const fmt = (v: number) => (v >= 10000 ? `${Math.round(v / 10000)}만원` : `${v.toLocaleString()}원`);

  const ITEM_WIDTH = 64;
  const chartWidth = Math.max(multiDayData.length * ITEM_WIDTH, 280);

  const points = multiDayData.map((item, index) => {
    const x = index * ITEM_WIDTH + ITEM_WIDTH / 2;
    const barH = item.revenue > 0 ? Math.max((item.revenue / multiScale) * BAR_MAX_H, 10) : 0;
    const y = BAR_MAX_H - barH;
    return { x, y, barH, item, index };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const fillD = `${pathD} L ${points[points.length - 1].x} ${BAR_MAX_H} L ${points[0].x} ${BAR_MAX_H} Z`;

  return (
    <View style={s.chartArea}>
      <View style={s.chartInner}>
        {/* Y축 레이블 (수평 기준선선에 100% 정밀 중앙 정렬) */}
        <View style={s.chartYAxisFixed}>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H + 24 - 6 }]}>{fmt(multiScale)}</Text>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: BAR_MAX_H / 2 + 24 - 6 }]}>{fmt(multiHalfScale)}</Text>
          <Text style={[s.chartYLabel, { position: "absolute", bottom: 24 - 6 }]}>0</Text>
        </View>

        {/* 차트 본문 */}
        <View style={s.chartBodyFixed}>
          {/* 수평 그리드 라인 */}
          <View style={[s.gridLineFull, { bottom: BAR_MAX_H + 24 }]} />
          <View style={[s.gridLineFull, { bottom: BAR_MAX_H / 2 + 24 }]} />
          <View style={[s.gridLineFull, { bottom: 24 }]} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 36, width: chartWidth, flexGrow: 1 }}
          >
            <View style={{ width: chartWidth, height: "100%", position: "relative" }}>
              <Svg width={chartWidth} height={BAR_MAX_H} style={{ position: "absolute", bottom: 24, left: 0 }}>
                <Path d={fillD} fill="rgba(255, 197, 84, 0.18)" />
                <Path d={pathD} fill="none" stroke="#FFC554" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                {points.map((p) => (
                  <Circle
                    key={p.item.date + p.index}
                    cx={p.x}
                    cy={p.y}
                    r={selectedIndex === p.index ? 6.5 : 4}
                    fill={selectedIndex === p.index ? "#FFC554" : "#FFFFFF"}
                    stroke="#FFC554"
                    strokeWidth={selectedIndex === p.index ? 2.5 : 2}
                  />
                ))}
              </Svg>

              {/* 터치 가능한 도트 포인트 및 툴팁 */}
              {points.map((p) => {
                const isSelected = selectedIndex === p.index;
                return (
                  <Pressable
                    key={p.item.date + p.index}
                    onPress={() => setSelectedIndex(p.index)}
                    style={{
                      position: "absolute",
                      left: p.x - 22,
                      top: 0,
                      bottom: 0,
                      width: 44,
                      alignItems: "center",
                    }}
                  >
                    {isSelected ? (
                      <View
                        style={[
                          s.lineChartTooltip,
                          {
                            bottom: p.barH + 38,
                            left: p.index === 0 ? -6 : p.index === points.length - 1 ? -52 : -28,
                          },
                        ]}
                      >
                        <View style={s.tooltipRow}>
                          <View style={[s.tooltipDot, { backgroundColor: "#FFC554" }]} />
                          <Text style={s.tooltipText}>{p.item.date}</Text>
                        </View>
                        <Text numberOfLines={1} style={s.tooltipAmountText}>{p.item.label}</Text>
                        <View
                          style={[
                            s.tooltipArrowCentered,
                            { left: p.index === 0 ? 22 : p.index === points.length - 1 ? 68 : 44 },
                          ]}
                        />
                      </View>
                    ) : null}
                    <Text
                      style={[
                        s.chartDateLabelSingle,
                        { position: "absolute", bottom: 0 },
                        isSelected && { color: colors.black, fontWeight: "600" },
                      ]}
                    >
                      {p.item.date}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  cardBg,
  muted,
  trend,
  trendColor,
  iconType,
  startDate,
  endDate,
  totalRevenue,
  isHistory,
  isRegistered,
  onPress,
  onReturn,
}: {
  label: string;
  value: string;
  cardBg?: string;
  muted?: boolean;
  trend?: string;
  trendColor?: string;
  iconType?: "coins" | "box" | "period";
  startDate?: string;
  endDate?: string;
  totalRevenue?: number;
  isHistory?: boolean;
  isRegistered?: boolean;
  onPress?: () => void;
  onReturn?: () => void | Promise<void>;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [registeredOpen, setRegisteredOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const isDailySales = label.includes("당일 매출");

  const handlePress = () => {
    if (isHistory) {
      if (!endDate || endDate === startDate) {
        onPress?.();
      } else {
        setHistoryOpen(true);
      }
    } else if (isRegistered) {
      setRegisteredOpen(true);
    } else if (isDailySales) {
      setReportOpen(true);
    } else {
      onPress?.();
    }
  };

  const todayStr = dateKey(new Date());
  const effectiveStart = startDate ?? todayStr;
  const effectiveEnd = endDate ?? startDate ?? todayStr;

  return (
    <>
      <Pressable style={[s.summaryCard, cardBg ? { backgroundColor: cardBg } : null]} onPress={handlePress}>
        <View style={s.summaryInner}>
          {/* 아이콘 (위) */}
          <View style={s.summaryTop}>
            <View style={s.summaryIconContainer}>
              {iconType === "box" ? (
                <BoxIcon width={36} height={36} />
              ) : iconType === "period" ? (
                <PeriodSalesIcon width={36} height={36} />
              ) : (
                <CoinsIcon width={36} height={36} />
              )}
            </View>
          </View>
          {/* 텍스트 (아래) */}
          <View style={s.summaryText}>
            <Text style={[s.summaryLabel, muted ? { color: "#989792" } : { color: "#111111" }]}>{label}</Text>
            <View style={s.summaryValueRow}>
              <Text style={[s.summaryValue, muted ? { color: "#989792" } : { color: "#111111" }]}>{value}</Text>
              {trend ? (
                <View style={[s.trendBadge, trendColor ? { backgroundColor: trendColor } : null]}>
                  <Text style={s.trendText}>{trend}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        {/* 화살표 */}
        <ChevronRight width={24} height={24} color={muted ? "#989792" : "#2B2B29"} />
      </Pressable>
      <Modal
        visible={reportOpen}
        animationType="slide"
        onRequestClose={() => { setReportOpen(false); void onReturn?.(); }}
      >
        <DeviceFrame>
          <SalesReportScreen startDate={effectiveStart} endDate={effectiveEnd} onBack={() => { setReportOpen(false); void onReturn?.(); }} />
        </DeviceFrame>
      </Modal>
      <Modal
        visible={registeredOpen}
        animationType="slide"
        onRequestClose={() => { setRegisteredOpen(false); void onReturn?.(); }}
      >
        <DeviceFrame>
          <RegisteredProductsScreen onBack={() => { setRegisteredOpen(false); void onReturn?.(); }} />
        </DeviceFrame>
      </Modal>
      <Modal
        visible={historyOpen}
        animationType="slide"
        onRequestClose={() => { setHistoryOpen(false); void onReturn?.(); }}
      >
        <DeviceFrame>
          <SalesHistoryScreen
            startDate={effectiveStart}
            endDate={effectiveEnd}
            totalRevenue={totalRevenue ?? 0}
            onBack={() => { setHistoryOpen(false); void onReturn?.(); }}
          />
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
    <View style={floatingNavigationStyles.nav}>
      {tabs.map(([label, Icon, onPress], i) => {
        const selected =
          (active === "home" && i === 0) ||
          (active === "products" && i === 1) ||
          (active === "ai" && i === 2) ||
          (active === "mypage" && i === 3);
        const color = selected ? colors.primary500 : colors.g400;
        return (
          <Pressable key={label} style={floatingNavigationStyles.item} onPress={onPress}>
            <Icon width={24} height={24} color={color} />
            <Text style={[floatingNavigationStyles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  chromeContent: { flex: 1, paddingTop: 56, backgroundColor: colors.white },
  dashboard: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 100 },
  dashboardTitle: { fontSize: 20, fontWeight: "600", marginBottom: 16 },
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
  // 차트 유형 토글 (아이콘 전용)
  chartTypeToggleRowIconOnly: {
    flexDirection: "row",
    alignSelf: "flex-end",
    backgroundColor: "#F2F2F1",
    borderRadius: 16,
    padding: 3,
    gap: 2,
    marginTop: 12,
    marginBottom: 10,
  },
  chartTypeBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  chartTypeBtnIconActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  singleLineChartWrapper: {
    flex: 1,
    position: "relative",
    justifyContent: "flex-end",
  },
  linePointsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 40,
  },
  // 차트 범례
  chartLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 13, height: 13, borderRadius: 6.5 },
  legendText: { fontSize: 12, color: colors.g400 },
  // 차트 영역
  chartArea: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 12,
    overflow: "visible",
  },
  chartEmpty: { fontSize: 12, color: colors.g500, textAlign: "center" },
  chartEmptyWrapper: { flex: 1, alignItems: "center", justifyContent: "center" },
  chartInner: { flex: 1, width: "100%", flexDirection: "row", alignItems: "flex-end", position: "relative" },
  chartYAxis: {
    width: 36,
    alignSelf: "stretch",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingTop: 0,
  },
  chartYAxisFixed: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    width: 44,
    zIndex: 5,
  },
  chartYLabel: { fontSize: 10, color: colors.g500, textAlign: "left" },
  chartBody: {
    flex: 1,
    alignSelf: "stretch",
    position: "relative",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  chartBodyFixed: {
    flex: 1,
    alignSelf: "stretch",
    position: "relative",
    justifyContent: "flex-end",
    paddingLeft: 44,
    paddingBottom: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.g200,
  },
  gridLineFull: {
    position: "absolute",
    left: 50,
    right: 16,
    height: 1,
    backgroundColor: colors.g200,
  },
  multiBarScrollContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 36,
    paddingRight: 48,
    gap: 20,
  },
  barColumnItemMulti: {
    alignItems: "center",
    width: 44,
  },
  barColumnItem: {
    alignItems: "center",
  },
  chartDateLabelSingle: {
    marginTop: 6,
    fontSize: 11,
    color: colors.g500,
    textAlign: "center",
  },
  barsScrollContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 16,
    paddingRight: 16,
    gap: 16,
  },
  singleBarWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  yellowBarWrapper: {
    position: "relative",
    alignItems: "center",
  },
  markerDotOnYellowBar: {
    position: "absolute",
    top: -11,
    left: 11, // 44px 바 폭 중앙 (44-22)/2 = 11
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  chartTooltipOnYellowBar: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 14,
    left: -28, // 툴팁 박스가 주황색 바 중앙 위에 정렬되도록
    minWidth: 108,
    backgroundColor: colors.g800,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  lineChartTooltip: {
    position: "absolute",
    minWidth: 108,
    backgroundColor: colors.g800,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipAmountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
    marginTop: 4,
    paddingLeft: 19,
    flexShrink: 0,
  },
  tooltipArrowCentered: {
    position: "absolute",
    bottom: -7,
    left: 44, // 툴팁 박스 하단 중앙 화살표
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.g800,
  },
  barPairWrapper: {
    alignItems: "center",
    gap: 4,
  },
  barsRowItem: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  chartBar: {
    width: 28,
    borderRadius: 100,
  },
  chartBarSingle: {
    width: 44,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  chartDateLabel: {
    marginTop: 6,
    fontSize: 10,
    color: colors.g500,
    textAlign: "center",
  },
  // 툴팁 + 마커 (단일 일자 - 주황색 바 꼭대기 위)
  markerDotOnYellow: {
    position: "absolute",
    left: 180,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  chartTooltipOnYellow: {
    position: "absolute",
    left: 142,
    backgroundColor: colors.g800,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tooltipArrowOnYellow: {
    position: "absolute",
    bottom: -7,
    left: 42,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.g800,
  },
  // 툴팁 + 마커 (다중 일자)
  markerDot: {
    position: "absolute",
    left: 30, // 지난 주(회색) 바 중앙 부근
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  markerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.g800,
  },
  chartTooltip: {
    position: "absolute",
    left: 5, // 지난 주(회색) 바 왼쪽 정렬
    backgroundColor: colors.g800,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tooltipRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tooltipDot: { width: 13, height: 13, borderRadius: 6.5 },
  tooltipText: { fontSize: 10, color: colors.white, fontWeight: "500" },
  tooltipArrow: {
    position: "absolute",
    bottom: -7,
    left: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.g800,
  },
  // 요약 카드
  summaryCards: { gap: 8 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingVertical: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.g100,
  },
  summaryInner: { flex: 1, gap: 16 },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  // 요약 카드 아래 결제 수락 · 현황 관리 카드
  paymentManageCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: "#F2F2F1",
    gap: 14,
  },
  paymentManageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentManageTitle: { fontSize: 16, fontWeight: "600", color: "#111111" },
  paymentManageSub: { fontSize: 12, color: colors.g600 },
  paymentManageDetailBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  paymentManageDetailText: { fontSize: 12, fontWeight: "600", color: "#2B2B29" },
  paymentStatusTags: { flexDirection: "row", gap: 8 },
  paymentStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  paymentStatusDot: { width: 8, height: 8, borderRadius: 4 },
  paymentStatusPillText: { fontSize: 12, fontWeight: "600" },
  quickPaymentCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.g200,
  },
  quickPaymentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quickPaymentTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.black },
  quickPaymentTime: { fontSize: 11, color: colors.g500 },
  quickPaymentMeta: { fontSize: 12, color: colors.g600 },
  quickPaymentButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  quickAcceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFC554",
    alignItems: "center",
    justifyContent: "center",
  },
  quickAcceptBtnText: { fontSize: 13, fontWeight: "600", color: "#111111" },
  quickRejectBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E6E6E5",
    alignItems: "center",
    justifyContent: "center",
  },
  quickRejectBtnText: { fontSize: 13, fontWeight: "600", color: "#767676" },

  // SellerPaymentCard 확장 스타일
  resCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  resTime: { fontSize: 12, color: colors.g500 },
  priceLabel: { fontSize: 12, color: colors.g600 },
  paymentAcceptBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#FFC554", alignItems: "center", justifyContent: "center" },
  paymentAcceptBtnText: { fontSize: 14, fontWeight: "600", color: "#111111" },
  paymentRejectBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#E6E6E5", alignItems: "center", justifyContent: "center" },
  paymentRejectBtnText: { fontSize: 14, fontWeight: "600", color: "#767676" },
  coinIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  coinRow: {
    width: 22,
    height: 6,
    borderRadius: 3,
  },
  boxIconWrapper: {
    width: 24,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  boxIconBody: {
    width: 22,
    height: 16,
    borderRadius: 3,
    backgroundColor: "#D6A56E",
  },
  boxIconTape: {
    position: "absolute",
    top: 2,
    width: 8,
    height: 12,
    backgroundColor: "#B88349",
    borderRadius: 1,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 40,
    backgroundColor: colors.success,
  },
  trendText: { fontSize: 12, color: colors.white, fontWeight: "600" },
  summaryText: { gap: 6 },
  summaryLabel: { fontSize: 12, color: colors.g800 },
  summaryLabelMuted: { color: colors.g500 },
  summaryValueRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryValue: { fontSize: 20, fontWeight: "600", color: colors.black },
  summaryValueMuted: { color: colors.g500 },
  // 결제 상태 (이전 스타일 — payments 페이지에서 사용)
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
    height: 27,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  barPart: { height: "100%" },
  emptyBar: { flex: 1, backgroundColor: colors.g300 },
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
    bottom: 20,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,.78)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
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
