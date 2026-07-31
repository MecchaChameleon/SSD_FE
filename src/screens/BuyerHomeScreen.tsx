import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  findNodeHandle,
  Modal,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  AppHeader,
  BottomNavigation,
  NotificationBell,
  Product,
  PaymentDisplayStatus,
} from "../components/home";
import { colors, fonts, radius } from "../theme";
import ChevronDownIcon from "../../icon/chevron_down.svg";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import SearchIcon from "../../icon/search.svg";
import CloseIcon from "../../icon/x.svg";
import CouponIcon from "../../icon/coupon.svg";
import ArrowUpIcon from "../../icon/arrow_up.svg";
import { BuyerModeCompletion, MyPageScreen } from "./MyPageScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import { BuyerMapScreen } from "./BuyerMapScreen";
import { PaymentCompleteScreen } from "./PaymentCompleteScreen";
import { PurchaseHistoryScreen, PurchaseItem } from "./PurchaseHistoryScreen";
import { LikesScreen } from "./LikesScreen";
import { ProductListMode, ProductListScreen } from "./ProductListScreen";
import { TimeOptionWheel } from "./RegisteredProductsScreen";
import {
  HeroBannerCarousel,
  NewArrivalsSection,
  PopularProductsSection,
  PreferenceSection,
  PromoBanner,
  QuickMenuRow,
  RankedProductCard,
} from "./BuyerHomeSections";
import { buyerApi, BusinessType, Product as ApiProduct, Purchase as ApiPurchase, resolveApiAssetUrl } from "../api";
import { ScreenTransition } from "../components/ScreenTransition";
import { BuyerAiRecommendationScreen } from "./BuyerAiRecommendationModal";

export type PurchasePayload = {
  productId: number;
  productName: string;
  originalPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};
export const categories = [
  "전체",
  "음식점",
  "숙박",
  "체험",
  "렌탈 / 모빌리티",
  "빈 시간대 자원",
] as const;
export type BuyerCategory = (typeof categories)[number];
export const businessTypeByCategory: Partial<Record<BuyerCategory, BusinessType>> = {
  음식점: "RESTAURANT",
  숙박: "LODGING",
  체험: "EXPERIENCE",
  "렌탈 / 모빌리티": "RENTAL_MOBILITY",
};
export const sorts = [
  "할인율 높은순",
  "가까운 거리순",
  "마감 임박순",
  "낮은 가격순",
  "높은 가격순",
] as const;
const categoryLabels: Record<ApiProduct["category"], string> = {
  SAME_DAY_INVENTORY: "당일 재고",
  EMPTY_TIME_RESOURCE: "빈 시간대 자원",
  SAME_DAY_ROOM: "당일 공실",
  TOUR_REMAINDER: "이동/관광 잔여 상품",
};
export const money = (v: string) => Number(v.replace(/[^0-9]/g, ""));
const visitLabel=(date:Date)=>date.toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'});
const seoulDateKey=(date:Date)=>date.toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
const deadlineLabel=(deadlineAt:number)=>{
  const deadline=new Date(deadlineAt);
  const today=new Date();
  const tomorrow=new Date(today.getTime()+24*60*60*1000);
  const deadlineKey=seoulDateKey(deadline);
  const day=deadlineKey===seoulDateKey(today)
    ? '오늘'
    : deadlineKey===seoulDateKey(tomorrow)
      ? '내일'
      : deadline.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric',timeZone:'Asia/Seoul'});
  const time=deadline.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
  return `${day} ${time}`;
};
const firstVisitTime=(deadlineAt?:number)=>{const date=new Date();date.setSeconds(0,0);date.setMinutes(Math.ceil(date.getMinutes()/5)*5);if(deadlineAt&&date.getTime()>deadlineAt)return '';return visitLabel(date)};
export const apiProductToCard = (p: ApiProduct): Product => {
  const deadlineAt = new Date(p.deadline).getTime();
  const discountRate =
    p.discountRate ?? Math.round((1 - p.currentPrice / p.price) * 100);
  return {
    id: p.id,
    title: p.name,
    description: p.description,
    discount: `${discountRate}%`,
    shop: p.businessName ?? "",
    location: p.address ?? "",
    detail: `${categoryLabels[p.category]} · 마감 ${deadlineLabel(deadlineAt)}`,
    insight: p.aiInsight ?? "",
    original: `${p.price.toLocaleString()}원`,
    price: `${p.currentPrice.toLocaleString()}원`,
    remaining: `잔여수량 ${p.qty}개`,
    urgent:
      deadlineAt > Date.now() && deadlineAt - Date.now() <= 60 * 60 * 1000,
    deadlineAt,
    distanceMeters: p.distanceMeters,
    lat: p.lat,
    lng: p.lng,
    discountRate,
    imageUrls: (p.imageUrls ?? []).map(resolveApiAssetUrl),
    createdAt: p.createdAt,
  };
};
const paymentStatus = (status:ApiPurchase['status']):PaymentDisplayStatus => status==='ACCEPTED'?'accepted':status==='REFUNDED'?'refunded':'pending';
const apiPurchaseToItem = (item: ApiPurchase): PurchaseItem => ({
  id: item.id,
  product: {
    id: item.productId,
    title: item.productName,
    discount: "",
    shop: item.businessName ?? "",
    location: "",
    detail: "결제 상품",
    insight: "",
    original: `${item.originalPrice.toLocaleString()}원`,
    price: `${item.unitPrice.toLocaleString()}원`,
    remaining: "",
  },
  status: paymentStatus(item.status),
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  totalAmount: item.totalAmount,
  purchasedAt: item.requestedAt,
  rejectReason: item.rejectReason,
});

export function BuyerHomeScreen({
  initialEntry='buyer',
  onBusinessRegistered,
  onLogout,
  onWithdraw,
  onPurchase,
}: {
  initialEntry?: 'buyer'|'seller'|'businessRegistration';
  onBusinessRegistered?: () => void;
  onLogout: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  onPurchase?: (payload: PurchasePayload) => void | Promise<void>;
}) {
  const [category, setCategory] = useState<BuyerCategory>("전체");
  const [productItems, setProductItems] = useState<Product[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [purchase, setPurchase] = useState<Product | null>(null);
  const [checkout,setCheckout]=useState<'order'|'payment'|null>(null);
  const [visitTime,setVisitTime]=useState('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [tab, setTab] = useState<"home" | "map" | "purchases" | "likes" | "mypage">(initialEntry==='businessRegistration'?"mypage":"home");
  const [tabDirection,setTabDirection]=useState<-1|1>(1);
  const [myPageRoot,setMyPageRoot]=useState(initialEntry!=='businessRegistration');
  const [sellerMode, setSellerMode] = useState(initialEntry==='seller');
  const [buyerModeComplete,setBuyerModeComplete]=useState(false);
  const [buyerHomeReady,setBuyerHomeReady]=useState(initialEntry!=='seller');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("할인율 높은순");
  const [listView, setListView] = useState<{ title: string; mode: ProductListMode; category: BuyerCategory; sort: (typeof sorts)[number] } | null>(null);
  const [aiRecommendationOpen, setAiRecommendationOpen] = useState(false);
  const aiRecommendationSlide = useRef(new Animated.Value(0)).current;
  const { width: viewportWidth } = useWindowDimensions();
  const [quantity, setQuantity] = useState(2);
  const [now, setNow] = useState(Date.now());
  const [userLocation,setUserLocation]=useState<{lat:number;lng:number}|null>(null);
  const [preferenceItems, setPreferenceItems] = useState<Product[]>([]);
  const [newArrivalItems, setNewArrivalItems] = useState<Product[]>([]);
  const homeScrollRef = useRef<ScrollView>(null);
  const popularSectionRef = useRef<View>(null);
  const scrollToPopularSection = () => {
    const scrollHandle = findNodeHandle(homeScrollRef.current);
    if (scrollHandle == null) return;
    popularSectionRef.current?.measureLayout(
      scrollHandle,
      (_left, top) => homeScrollRef.current?.scrollTo({ y: Math.max(0, top - 12), animated: true }),
      () => undefined,
    );
  };
  const refreshPurchases=useCallback(async()=>{
    const page=await buyerApi.purchases({size:50});
    setPurchases(page.content.map(apiPurchaseToItem));
  },[]);
  const navigateTab=(next:"home"|"map"|"purchases"|"likes"|"mypage")=>{
    if(next===tab)return;
    const order={home:0,map:1,purchases:2,likes:3,mypage:4};
    setTabDirection(order[next]>order[tab]?1:-1);
    setTab(next);
    if(next==='purchases')void refreshPurchases().catch(()=>undefined);
  };
  const openAiRecommendation=()=>{
    aiRecommendationSlide.setValue(0);
    setAiRecommendationOpen(true);
    requestAnimationFrame(()=>Animated.timing(aiRecommendationSlide,{
      toValue:1,
      duration:280,
      easing:Easing.out(Easing.cubic),
      useNativeDriver:true,
    }).start());
  };
  const closeAiRecommendation=(product?:ApiProduct)=>{
    Animated.timing(aiRecommendationSlide,{
      toValue:0,
      duration:260,
      easing:Easing.in(Easing.cubic),
      useNativeDriver:true,
    }).start(({finished})=>{
      if(!finished)return;
      setAiRecommendationOpen(false);
      if(product)setDetailProduct(apiProductToCard(product));
    });
  };
  const tabScreen=(content:React.ReactNode)=>{
    const chromeVisible=tab!=='mypage'||myPageRoot;
    return <View style={{flex:1,overflow:'hidden'}}>
      <ScreenTransition key={tab} direction={tabDirection}>{content}</ScreenTransition>
      {tab!=='map'&&chromeVisible?<View style={{position:'absolute',left:0,right:0,top:0,zIndex:20,backgroundColor:colors.white}}><AppHeader showBell={tab!=='home'}/></View>:null}
      {chromeVisible?<View style={{position:'absolute',left:0,right:0,bottom:0,zIndex:20,height:66}}><BottomNavigation active={tab} onSelect={navigateTab}/></View>:null}
    </View>;
  };
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(position=>setUserLocation({lat:position.coords.latitude,lng:position.coords.longitude}))},[]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (sellerMode) return;
    const businessType=businessTypeByCategory[category];
    const nearby=sort==="가까운 거리순"&&userLocation;
    const sortQuery=nearby?{sort:"DISTANCE_ASC" as const,lat:userLocation.lat,lng:userLocation.lng}:{};
    const refreshProducts=()=>buyerApi
      .products({ size: 50, businessType, ...sortQuery })
      .then(async page => {
        if(page.content.length||!businessType)return page.content;
        const all=await buyerApi.products({size:50, ...sortQuery});
        return all.content.filter(product=>product.businessType===businessType);
      })
      .then(items => {
        const cards=items.map(apiProductToCard);
        cards.forEach(card=>card.imageUrls?.forEach(url=>{void Image.prefetch(url)}));
        setProductItems(cards);
      })
      .catch(() => setProductItems([]))
      .finally(()=>setBuyerHomeReady(true));
    void refreshProducts();
    const productInterval=setInterval(refreshProducts,5_000);
    buyerApi
      .wishlist({ size: 50 })
      .then((page) => setLiked(page.content.map((item) => item.id)))
      .catch(() => undefined);
    void refreshPurchases().catch(() => undefined);
    return()=>clearInterval(productInterval);
  }, [sellerMode, category, refreshPurchases, sort, userLocation]);
  useEffect(() => {
    if (sellerMode) return;
    buyerApi
      .products({ size: 8, sort: "AI_RECOMMENDED" })
      .then((page) => setPreferenceItems(page.content.map(apiProductToCard)))
      .catch(() => setPreferenceItems([]));
    buyerApi
      .products({ size: 20 })
      .then((page) => {
        const sorted = [...page.content].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setNewArrivalItems(sorted.slice(0, 4).map(apiProductToCard));
      })
      .catch(() => setNewArrivalItems([]));
  }, [sellerMode]);
  const shown = useMemo(() => {
    let list = productItems.map((item) => {const distance=userLocation&&item.lat!=null&&item.lng!=null?Math.round(6371000*2*Math.asin(Math.sqrt(Math.sin((item.lat-userLocation.lat)*Math.PI/360)**2+Math.cos(userLocation.lat*Math.PI/180)*Math.cos(item.lat*Math.PI/180)*Math.sin((item.lng-userLocation.lng)*Math.PI/360)**2))):item.distanceMeters;return ({
      ...item,distanceMeters:distance,location:distance!=null?`${item.location} · ${distance<1000?`${distance}m`:`${(distance/1000).toFixed(1)}km`}`:item.location,
      urgent:
        !!item.deadlineAt &&
        item.deadlineAt > now &&
        item.deadlineAt - now <= 60 * 60 * 1000,
    })}).filter(
      (p) =>
        !query.trim() ||
        `${p.title} ${p.shop} ${p.location}`.includes(query.trim()),
    );
    if (sort === "할인율 높은순")
      list = [...list].sort(
        (a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0),
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
    return list;
  }, [productItems, query, sort, now,userLocation]);
  const submitSearch = () => {
    const value = query.trim();
    if (value)
      setRecent((v) => [value, ...v.filter((x) => x !== value)].slice(0, 5));
    setSearching(false);
  };
  const confirmPurchase = async () => {
    if (!purchase) return;
    const created=await buyerApi.purchase({ productId: purchase.id, quantity });
    const createdItem=apiPurchaseToItem(created);
    setPurchases(items=>[createdItem,...items.filter(item=>item.id!==createdItem.id)]);
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
      ).filter(item=>money(item.remaining)>0),
    );
    setPurchase(null);
    setCheckout(null);
    setPaymentComplete(true);
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
  const productCards = shown.map((p, i) => (
    <RankedProductCard key={p.id} product={p} rank={i + 1} onPress={() => setDetailProduct(p)} />
  ));
  if(detailProduct) return <BuyerProductDetail product={detailProduct} liked={liked.includes(detailProduct.id)} onBack={()=>setDetailProduct(null)} onLike={()=>toggleLike(detailProduct.id)} onBuy={()=>{setQuantity(1);setVisitTime(firstVisitTime(detailProduct.deadlineAt));setPurchase(detailProduct);setCheckout('order');setDetailProduct(null)}}/>;
  if(listView) return <ProductListScreen title={listView.title} mode={listView.mode} initialCategory={listView.category} initialSort={listView.sort} userLocation={userLocation} onBack={()=>setListView(null)} onSelectProduct={(p)=>{setListView(null);setDetailProduct(p)}}/>;
  if(checkout==='order'&&purchase)return <OrderForm product={purchase} quantity={quantity} visitTime={visitTime} onQuantity={setQuantity} onVisitTime={setVisitTime} onBack={()=>{setCheckout(null);setPurchase(null)}} onNext={()=>setCheckout('payment')}/>;
  if(checkout==='payment'&&purchase)return <PaymentForm product={purchase} quantity={quantity} onBack={()=>setCheckout('order')} onPay={confirmPurchase}/>;
  if(paymentComplete) return <PaymentCompleteScreen onPurchases={()=>{setPaymentComplete(false);navigateTab('purchases')}} onHome={()=>{setPaymentComplete(false);navigateTab('home')}}/>;
  if(buyerModeComplete)return <BuyerModeCompletion ready={buyerHomeReady} onDone={()=>setBuyerModeComplete(false)}/>;
  if (sellerMode)
    return (
      <SellerHomeScreen
        onBuyerMode={() => {setBuyerHomeReady(false);setSellerMode(false);setTab('home');setBuyerModeComplete(true);}}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  if (tab === "mypage")
    return tabScreen(
      <MyPageScreen
        initialBusinessRegistration={initialEntry==='businessRegistration'}
        onBusinessRegistered={onBusinessRegistered}
        onHome={() => navigateTab("home")}
        onMap={() => navigateTab("map")}
        onPurchases={() => navigateTab("purchases")}
        onSellerMode={() => setSellerMode(true)}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
        onRootChange={setMyPageRoot}
      />
    );
  if (tab === "purchases")
    return tabScreen(
      <PurchaseHistoryScreen
        items={purchases}
        onHome={() => navigateTab("home")}
        onMap={() => navigateTab("map")}
        onMyPage={() => navigateTab("mypage")}
        onDelete={(id) => {
          void buyerApi
            .hidePurchase(id)
            .then(() => setPurchases((v) => v.filter((x) => x.id !== id)));
        }}
      />
    );
  if (tab === "likes")
    return tabScreen(
      <LikesScreen
        onHome={() => navigateTab("home")}
        onMap={() => navigateTab("map")}
        onPurchases={() => navigateTab("purchases")}
        onMyPage={() => navigateTab("mypage")}
        onSelectProduct={(p) => setDetailProduct(p)}
      />
    );
  if (tab === "map")
    return tabScreen(
      <BuyerMapScreen
        onHome={() => navigateTab("home")}
        onPurchases={() => navigateTab("purchases")}
        onMyPage={() => navigateTab("mypage")}
        onBuy={(item) => {
          setDetailProduct(apiProductToCard(item));
          setTab("home");
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
  return <View style={s.root}>
    {tabScreen(<View style={s.root}>
      <AppHeader showBell={false} />
      <ScrollView
        ref={homeScrollRef}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.searchRow}>
          <Pressable onPress={() => setSearching(true)} style={[s.searchBar, s.searchBarFlex]}>
            <Text style={[s.searchPlaceholder, query && s.searchValue]}>
              {query || "지역명, 가게 이름, 키워드로 검색"}
            </Text>
            <SearchIcon width={20} height={20} color={colors.g500} />
          </Pressable>
          <Pressable accessibilityLabel="쿠폰함" style={s.searchIconButton}>
            <CouponIcon width={22} height={22} color={colors.g700} />
          </Pressable>
          <View style={s.searchIconButton}>
            <NotificationBell role="buyer" />
          </View>
        </View>
        <HeroBannerCarousel />
        <QuickMenuRow
          onAiRecommend={openAiRecommendation}
          onSelect={(label) => {
            if (label === "마감 임박") setSort("마감 임박순");
            else if (label === "내 근처") setSort("가까운 거리순");
            requestAnimationFrame(scrollToPopularSection);
          }}
        />
        <PreferenceSection
          products={preferenceItems}
          onSelect={(item) => setDetailProduct(item)}
          onSeeAll={() => setListView({ title: "내 취향 상품", mode: "preference", category: "전체", sort: "할인율 높은순" })}
        />
        <View ref={popularSectionRef}>
        <PopularProductsSection
          categories={categories}
          category={category}
          onCategory={setCategory}
          onSeeAll={() => setListView({ title: "현재 인기 상품", mode: "popular", category, sort })}
        >
          {productCards.length > 0 ? (
            productCards
          ) : (
            <Text style={s.empty}>검색 결과가 없습니다.</Text>
          )}
        </PopularProductsSection>
        </View>
        <PromoBanner
          title="SNS에서 뜨는 캠핑 인기템"
          subtitle="캠핑용품 특가 모음 -72%"
        />
        <NewArrivalsSection
          items={newArrivalItems}
          onSelect={(item) => setDetailProduct(item)}
          onSeeAll={() => setListView({ title: "신규 상품 · 자원", mode: "new", category: "전체", sort: "할인율 높은순" })}
        />
      </ScrollView>
      <Pressable
        accessibilityLabel="맨 위로"
        style={s.scrollTopButton}
        onPress={() => homeScrollRef.current?.scrollTo({ y: 0, animated: true })}
      >
        <ArrowUpIcon width={24} height={24} color={colors.g700} />
      </Pressable>
      <BottomNavigation active="home" onSelect={navigateTab} />
    </View>)}
    {aiRecommendationOpen?<Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        s.aiRecommendationLayer,
        {transform:[{translateX:aiRecommendationSlide.interpolate({
          inputRange:[0,1],
          outputRange:[Math.min(viewportWidth,430),0],
        })}]},
      ]}
    >
      <BuyerAiRecommendationScreen
        location={userLocation}
        onBack={()=>closeAiRecommendation()}
        onSelect={(product)=>closeAiRecommendation(product)}
      />
    </Animated.View>:null}
  </View>;
}
function OrderForm({product,quantity,visitTime,onQuantity,onVisitTime,onBack,onNext}:{product:Product;quantity:number;visitTime:string;onQuantity:(v:number)=>void;onVisitTime:(v:string)=>void;onBack:()=>void;onNext:()=>void}){
  const [picker,setPicker]=useState(false);
  const [quantityText,setQuantityText]=useState(String(quantity));
  const maxQuantity=Number(product.remaining.replace(/[^0-9]/g,''))||99;
  const validQuantity=quantityText!==''&&Number(quantityText)>=1;
  const changeQuantity=(value:string)=>{
    const digits=value.replace(/\D/g,'');
    if(!digits){setQuantityText('');return}
    const parsed=Number(digits);
    if(parsed<1){setQuantityText(digits);return}
    const next=Math.min(maxQuantity,parsed);
    setQuantityText(String(next));
    onQuantity(next);
  };
  const commitQuantity=()=>{if(!validQuantity){setQuantityText('1');onQuantity(1)}};
  const times=useMemo(()=>{const values:string[]=[];const cursor=new Date();cursor.setSeconds(0,0);cursor.setMinutes(Math.ceil(cursor.getMinutes()/5)*5);const deadline=product.deadlineAt??cursor.getTime();while(cursor.getTime()<=deadline){values.push(visitLabel(cursor));cursor.setMinutes(cursor.getMinutes()+5)}return values},[product.deadlineAt]);
  // The time list is intentionally constrained by its containing bottom sheet.
  // @ts-ignore React Native accepts an optional style key generated below at runtime.
  return <View style={checkoutStyles.root}><CheckoutHeader title="주문하기" onBack={onBack}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={checkoutStyles.content}><Text style={checkoutStyles.sectionTitle}>상품 정보</Text><CheckoutProduct product={product}/><Text style={[checkoutStyles.sectionTitle,{marginTop:24}]}>주문 정보 작성</Text><Text style={checkoutStyles.label}>수량<Text style={checkoutStyles.required}> *</Text></Text><TextInput value={quantityText} onChangeText={changeQuantity} onBlur={commitQuantity} keyboardType="number-pad" style={checkoutStyles.input}/><Text style={checkoutStyles.label}>방문 시각<Text style={checkoutStyles.required}> *</Text></Text><Pressable disabled={!times.length} onPress={()=>setPicker(true)} style={checkoutStyles.input}><Text style={[checkoutStyles.inputText,!visitTime&&{color:colors.g400}]}>{visitTime||'선택 가능한 시간이 없습니다.'}</Text><ChevronDownIcon width={24} height={24} color={colors.g400}/></Pressable></ScrollView><View style={checkoutStyles.bottom}><Pressable disabled={!visitTime||!validQuantity} onPress={onNext} style={[checkoutStyles.primaryButton,(!visitTime||!validQuantity)&&checkoutStyles.disabled]}><Text style={[checkoutStyles.primaryText,(!visitTime||!validQuantity)&&checkoutStyles.disabledText]}>다음</Text></Pressable></View><TimeOptionWheel visible={picker} value={visitTime} values={times} title="방문 시각 선택" onClose={()=>setPicker(false)} onApply={time=>{onVisitTime(time);setPicker(false)}}/></View>
}
function PaymentForm({product,quantity,onBack,onPay}:{product:Product;quantity:number;onBack:()=>void;onPay:()=>Promise<void>}){
  const [method,setMethod]=useState<string|null>(null);
  const [unsupported,setUnsupported]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [paymentError,setPaymentError]=useState('');
  const submittingRef=useRef(false);
  const total=money(product.price)*quantity;
  const submit=async()=>{
    if(method!=='토스페이'){setUnsupported(true);return}
    if(submittingRef.current)return;
    submittingRef.current=true;
    setSubmitting(true);
    setPaymentError('');
    try{await onPay()}
    catch(error){
      submittingRef.current=false;
      setSubmitting(false);
      setPaymentError(error instanceof Error?error.message:'결제를 완료하지 못했습니다. 다시 시도해 주세요.');
    }
  };
  return <View style={checkoutStyles.root}><CheckoutHeader title="결제하기" onBack={onBack}/><View style={checkoutStyles.content}><Text style={checkoutStyles.sectionTitle}>결제 상품</Text><View style={checkoutStyles.paymentRows}><PayRow label="상품명" value={product.title}/><PayRow label="정가" value={product.original}/><PayRow label="할인가" value={product.price}/><PayRow label="구매 수량" value={`${quantity}개`}/><PayRow label="결제금액" value={`${total.toLocaleString()}원`} bold/></View><View style={checkoutStyles.totalPay}><Text style={checkoutStyles.sectionTitle}>총 결제금액</Text><Text style={checkoutStyles.totalValue}>{total.toLocaleString()}원</Text></View><Text style={[checkoutStyles.sectionTitle,{marginTop:32}]}>결제 수단</Text><View style={checkoutStyles.methods}>{['토스페이','네이버페이','카카오페이'].map(value=><Pressable key={value} disabled={submitting} onPress={()=>setMethod(value)} style={[checkoutStyles.method,method===value&&checkoutStyles.methodOn]}><Text style={checkoutStyles.methodLogo}>{value==='토스페이'?'toss pay':value==='네이버페이'?'N pay':'● pay'}</Text><Text style={checkoutStyles.methodName}>{value}</Text></Pressable>)}</View>{paymentError?<Text style={checkoutStyles.paymentError}>{paymentError}</Text>:null}</View><View style={checkoutStyles.bottom}><Pressable accessibilityRole="button" accessibilityState={{disabled:!method||submitting,busy:submitting}} disabled={!method||submitting} onPress={()=>void submit()} style={[checkoutStyles.primaryButton,(!method||submitting)&&checkoutStyles.disabled]}><Text style={[checkoutStyles.primaryText,(!method||submitting)&&checkoutStyles.disabledText]}>{submitting?'결제 처리 중...':'결제하기'}</Text></Pressable></View><Modal transparent visible={unsupported} animationType="fade"><View style={checkoutStyles.alertOverlay}><View style={checkoutStyles.alert}><Text style={checkoutStyles.alertIcon}>ⓘ</Text><Text style={checkoutStyles.alertText}>아직 지원하지 않는 결제수단 입니다.</Text><Pressable onPress={()=>setUnsupported(false)} style={checkoutStyles.primaryButton}><Text style={checkoutStyles.primaryText}>확인</Text></Pressable></View></View></Modal></View>
}
function CheckoutHeader({title,onBack}:{title:string;onBack:()=>void}){return <View style={checkoutStyles.header}><Pressable onPress={onBack}><ChevronLeftIcon width={24} height={24} color={colors.black}/></Pressable><Text style={checkoutStyles.headerTitle}>{title}</Text><View style={{width:24}}/></View>}
function CheckoutProduct({product}:{product:Product}){return <View style={checkoutStyles.productBox}><Text style={checkoutStyles.productShop}>{product.shop}</Text><Text style={checkoutStyles.productDetail}>{product.detail}</Text><View style={checkoutStyles.productPriceRow}><Text style={checkoutStyles.productOriginal}>{product.original}</Text><Text style={checkoutStyles.productPrice}><Text style={checkoutStyles.saleLabel}>[할인가] </Text>{product.price}</Text></View><Text style={checkoutStyles.productDetail}>{product.remaining}</Text></View>}
function PayRow({label,value,bold}:{label:string;value:string;bold?:boolean}){return <View style={checkoutStyles.payRow}><Text style={checkoutStyles.payLabel}>{label}</Text><Text numberOfLines={2} style={[checkoutStyles.payValue,bold&&checkoutStyles.payBold]}>{value}</Text></View>}

function BuyerProductDetail({product,liked,onBack,onLike,onBuy}:{product:Product;liked:boolean;onBack:()=>void;onLike:()=>void;onBuy:()=>void}) {
  const images=product.imageUrls??[];
  const [index,setIndex]=useState(0);
  const {width}=useWindowDimensions();const frameWidth=Math.min(width,402);
  const heroCollapse=useRef(new Animated.Value(0)).current;
  const collapseStart=useRef(0);
  const panResponder=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dy)>6&&Math.abs(gesture.dy)>Math.abs(gesture.dx),
    onMoveShouldSetPanResponderCapture:(_,gesture)=>Math.abs(gesture.dy)>6&&Math.abs(gesture.dy)>Math.abs(gesture.dx),
    onPanResponderGrant:()=>{heroCollapse.stopAnimation(value=>{collapseStart.current=value})},
    onPanResponderMove:(_,gesture)=>heroCollapse.setValue(Math.max(0,Math.min(319,collapseStart.current-gesture.dy))),
    onPanResponderRelease:(_,gesture)=>{
      const position=Math.max(0,Math.min(319,collapseStart.current-gesture.dy));
      const target=gesture.vy<-.35?319:gesture.vy>.35?0:position>159.5?319:0;
      Animated.spring(heroCollapse,{toValue:target,tension:72,friction:12,useNativeDriver:false}).start();
    },
    onPanResponderTerminate:()=>Animated.spring(heroCollapse,{toValue:collapseStart.current>145?319:0,tension:72,friction:12,useNativeDriver:false}).start(),
  })).current;
  const heroHeight=heroCollapse.interpolate({inputRange:[0,319],outputRange:[319,0],extrapolate:'clamp'});
  const heroOpacity=heroCollapse.interpolate({inputRange:[0,245,319],outputRange:[1,.35,0],extrapolate:'clamp'});
  const heroScale=heroCollapse.interpolate({inputRange:[0,319],outputRange:[1,.78],extrapolate:'clamp'});
  return <View style={[detailStyles.root,gestureStyles.root,{width:frameWidth,alignSelf:'center'}]} {...panResponder.panHandlers}>
    <Animated.View style={[detailStyles.hero,{height:heroHeight,opacity:heroOpacity,transform:[{scale:heroScale}]}]}>{images.length?<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>setIndex(Math.round(event.nativeEvent.contentOffset.x/event.nativeEvent.layoutMeasurement.width))}>{images.map((url,i)=><Image key={`${url}-${i}`} source={{uri:url}} resizeMode="cover" style={[detailStyles.heroImage,{width:frameWidth}]}/>)}</ScrollView>:<View style={detailStyles.fallback}/>}<View style={detailStyles.heroActions}><Pressable onPress={onBack} style={detailStyles.circle}><ChevronLeftIcon width={24} height={24} color={colors.black}/></Pressable><Pressable onPress={onLike} style={detailStyles.circle}><Text style={[detailStyles.heart,liked&&detailStyles.heartLiked]}>♥</Text></Pressable></View>{images.length>1?<View style={detailStyles.dots}>{images.map((_,i)=><View key={i} style={[detailStyles.dot,index===i&&detailStyles.dotOn]}/>)}</View>:null}</Animated.View>
    <View style={[detailStyles.panel,gestureStyles.panel]}>
      <View style={gestureStyles.dragArea}><View style={gestureStyles.dragHandle}/></View>
      <View style={gestureStyles.panelContent}>
      <View style={detailStyles.titleRow}><View style={detailStyles.nameRow}><Text style={detailStyles.name}>{product.title}</Text>{product.urgent?<View style={detailStyles.tag}><Text style={detailStyles.tagText}>마감임박</Text></View>:null}</View><Text style={detailStyles.discount}>{product.discount}</Text></View>
      <View style={detailStyles.locationRow}><Text style={detailStyles.shop}>{product.shop}</Text><Text numberOfLines={1} style={detailStyles.location}>{product.location}</Text></View>
      <DetailRow label="상품정보" value={product.detail.split('·')[0].trim()}/><DetailRow label="마감시각" value={product.deadlineAt?deadlineLabel(product.deadlineAt):'-'}/><DetailRow label="잔여수량" value={product.remaining.replace(/[^0-9]/g,'')||'-'}/>
      <View style={detailStyles.priceRow}><Text style={detailStyles.original}>{product.original}</Text><View style={detailStyles.sale}><Text style={detailStyles.saleLabel}>[할인가]</Text><Text style={detailStyles.price}>{product.price}</Text></View></View>
      {product.description?<View style={{marginTop:8,paddingVertical:10,borderTopWidth:1,borderTopColor:colors.g200,gap:6}}><Text style={{fontSize:12,color:colors.g600}}>상품 설명</Text><Text style={{fontSize:14,lineHeight:20,color:colors.black}}>{product.description}</Text></View>:null}
      {product.insight?<View style={detailStyles.insight}><Text style={detailStyles.sun}>☼</Text><Text style={detailStyles.insightText}>{product.insight}</Text></View>:null}
      </View>
    </View>
    <View style={[detailStyles.bottom,gestureStyles.purchaseBottom]}><Pressable onPress={onBuy} style={detailStyles.buy}><Text style={detailStyles.buyText}>구매하기</Text></Pressable></View>
  </View>;
}
const checkoutStyles=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{fontSize:16,fontWeight:'600',color:colors.black},content:{padding:16,paddingBottom:110},sectionTitle:{fontSize:18,fontWeight:'600',color:colors.black,marginBottom:10},productBox:{borderWidth:1,borderColor:colors.g300,borderRadius:20,paddingHorizontal:12,paddingVertical:16,gap:5},productShop:{fontSize:14,fontWeight:'600',color:colors.g800},productDetail:{fontSize:12,color:colors.g600},productPriceRow:{marginTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},productOriginal:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},productPrice:{fontSize:20,fontWeight:'600',color:colors.info},saleLabel:{fontSize:10,fontWeight:'400'},label:{fontSize:14,fontWeight:'500',marginTop:16,marginBottom:8},required:{color:colors.primary500},input:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:8,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',fontSize:16,color:colors.black},inputText:{fontSize:16,color:colors.black},bottom:{position:'absolute',left:16,right:16,bottom:34},primaryButton:{height:56,borderRadius:12,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:16,fontWeight:'600',color:colors.white},disabled:{backgroundColor:colors.g200},disabledText:{color:colors.g400},sheetOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',justifyContent:'flex-end'},timeSheet:{backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,paddingBottom:34},handle:{width:60,height:4,borderRadius:2,backgroundColor:colors.g200,alignSelf:'center',marginBottom:18},sheetTitle:{fontSize:18,fontWeight:'600',marginBottom:8},timeItem:{height:48,borderBottomWidth:1,borderBottomColor:colors.g200,alignItems:'center',justifyContent:'center'},timeText:{fontSize:16,color:colors.g500},timeSelected:{fontSize:20,fontWeight:'600',color:colors.g800},paymentRows:{borderTopWidth:1,borderBottomWidth:1,borderColor:colors.g200,paddingVertical:8},payRow:{minHeight:28,paddingVertical:4,flexDirection:'row',alignItems:'center'},payLabel:{width:128,fontSize:14,color:colors.g600},payValue:{flex:1,textAlign:'right',fontSize:14,lineHeight:20,color:colors.black},payBold:{fontWeight:'600'},totalPay:{height:96,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.g200},totalValue:{fontSize:20,fontWeight:'600',color:colors.info},methods:{flexDirection:'row',gap:12},method:{flex:1,height:98,borderWidth:1,borderColor:colors.g200,borderRadius:12,alignItems:'center',justifyContent:'center',gap:10},methodOn:{borderColor:colors.primary500},methodLogo:{fontSize:12,fontWeight:'700'},methodName:{fontSize:14,color:colors.black},paymentError:{marginTop:12,fontSize:12,lineHeight:18,color:colors.danger,textAlign:'center'},alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',alignItems:'center',justifyContent:'center',padding:16},alert:{width:'100%',maxWidth:370,borderRadius:20,backgroundColor:colors.white,padding:20,gap:24},alertIcon:{fontSize:22,textAlign:'center'},alertText:{fontSize:16,fontWeight:'600',textAlign:'center'}});
(checkoutStyles as any).timeList={maxHeight:260};
(checkoutStyles as any).timeSheet={...checkoutStyles.timeSheet,width:'100%',maxWidth:402,alignSelf:'center',maxHeight:360};
function DetailRow({label,value}:{label:string;value:string}){return <View style={detailStyles.detailRow}><Text style={detailStyles.detailLabel}>{label}</Text><Text style={detailStyles.detailValue}>{value}</Text></View>}

const detailStyles=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},hero:{height:319,backgroundColor:colors.g100,position:'relative'},heroImage:{width:402,height:319},fallback:{flex:1,backgroundColor:colors.g100},heroActions:{position:'absolute',left:16,right:16,top:60,flexDirection:'row',justifyContent:'space-between'},circle:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(230,230,229,.72)',alignItems:'center',justifyContent:'center'},heart:{fontSize:24,color:colors.white},heartLiked:{color:colors.primary500},dots:{position:'absolute',bottom:40,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:8},dot:{width:6,height:6,borderRadius:3,backgroundColor:colors.g300},dotOn:{backgroundColor:colors.white},panel:{minHeight:494,marginTop:-29,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:colors.white,padding:16,paddingBottom:100},titleRow:{minHeight:52,paddingVertical:8,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10},nameRow:{flex:1,flexDirection:'row',alignItems:'flex-start',gap:8},name:{flex:1,fontSize:20,lineHeight:28,fontWeight:'600',color:colors.black},tag:{marginTop:3,paddingHorizontal:4,paddingVertical:2,borderRadius:4,backgroundColor:colors.primary500},tagText:{fontSize:12,fontWeight:'600',color:colors.white},discount:{marginTop:3,fontSize:14,fontWeight:'600',color:colors.info},locationRow:{height:32,flexDirection:'row',alignItems:'center',gap:12},shop:{fontSize:14,fontWeight:'600',color:'#2b2b29'},location:{flex:1,fontSize:12,color:colors.g600},detailRow:{height:32,flexDirection:'row',alignItems:'center'},detailLabel:{width:128,fontSize:12,color:colors.g600},detailValue:{flex:1,textAlign:'right',fontSize:14,fontWeight:'500',color:colors.black},priceRow:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},sale:{flexDirection:'row',alignItems:'center',gap:6},saleLabel:{fontSize:10,color:colors.info},price:{fontSize:20,fontWeight:'600',color:colors.info},insight:{marginTop:8,minHeight:69,paddingHorizontal:8,paddingVertical:16,borderRadius:8,backgroundColor:'rgba(255,237,204,.5)',flexDirection:'row',alignItems:'flex-start',gap:8},sun:{fontSize:24,color:colors.primary500},insightText:{flex:1,fontSize:12,lineHeight:16,fontWeight:'600',color:colors.primary500},bottom:{position:'absolute',left:16,right:16,bottom:34},buy:{height:56,borderRadius:12,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},buyText:{fontSize:16,fontWeight:'600',color:colors.white}});

const gestureStyles=StyleSheet.create({
  root:{overflow:'hidden'},
  panel:{flex:1,minHeight:0,marginTop:0,padding:0,paddingBottom:0,overflow:'hidden'},
  dragArea:{height:30,alignItems:'center',justifyContent:'center'},
  dragHandle:{width:54,height:4,borderRadius:2,backgroundColor:colors.g300},
  panelContent:{paddingHorizontal:16,paddingBottom:120},
  purchaseBottom:{left:0,right:0,bottom:0,paddingHorizontal:16,paddingTop:12,paddingBottom:34,backgroundColor:colors.white},
});

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
          <View style={s.purchaseContents}>
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
  aiRecommendationLayer: {
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.white,
  },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 92 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchBarFlex: { flex: 1, marginBottom: 0 },
  scrollTopButton: {
    position: "absolute",
    right: 16,
    bottom: 100,
    zIndex: 15,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  searchIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.g100,
  },
  searchBar: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.g100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchPlaceholder: { fontSize: 14, fontFamily: fonts.regular, color: colors.g500 },
  searchValue: { color: colors.black },
  heading: {
    marginLeft: 2,
    fontSize: 20,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    lineHeight: 24,
    color: colors.black,
    marginBottom: 16,
  },
  chips: { gap: 8, paddingRight: 14 },
  empty: { paddingVertical: 80, fontFamily: fonts.regular, textAlign: "center", color: colors.g500 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 20 },
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
    fontFamily: fonts.regular,
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
  recentTitle: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600" },
  clear: { fontSize: 12, fontFamily: fonts.regular, color: colors.g500 },
  recentItem: {
    height: 48,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  recentText: { fontSize: 14, fontFamily: fonts.regular, color: colors.g800 },
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 24,
  },
  dialogTitle: {
    width: "100%",
    fontSize: 18,
    fontWeight: "600",
    color: colors.black,
  },
  purchaseContents: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.g200,
  },
  totalRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { width: 128, fontSize: 14, fontWeight: "500", color: colors.black },
  total: { flex: 1, textAlign: "right", fontSize: 20, fontWeight: "600", color: colors.black },
  summary: {
    borderTopWidth: 1,
    borderColor: colors.g200,
  },
  summaryRow: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { width: 128, fontSize: 14, color: colors.g600 },
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
