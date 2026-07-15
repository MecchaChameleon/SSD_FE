import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Image,
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
  Product,
  ProductCard,
  PaymentDisplayStatus,
} from "../components/home";
import { Chip } from "../components/ui";
import { colors, radius } from "../theme";
import ChevronDownIcon from "../../icon/chevron_down.svg";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import SearchIcon from "../../icon/search.svg";
import CloseIcon from "../../icon/x.svg";
import { MyPageScreen } from "./MyPageScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import { BuyerMapScreen } from "./BuyerMapScreen";
import { PaymentCompleteScreen } from "./PaymentCompleteScreen";
import { PurchaseHistoryScreen, PurchaseItem } from "./PurchaseHistoryScreen";
import { TimeOptionWheel } from "./RegisteredProductsScreen";
import { buyerApi, BusinessType, Product as ApiProduct, Purchase as ApiPurchase, resolveApiAssetUrl } from "../api";

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
const visitLabel=(date:Date)=>date.toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'});
const firstVisitTime=(deadlineAt?:number)=>{const date=new Date();date.setSeconds(0,0);date.setMinutes(Math.ceil(date.getMinutes()/5)*5);if(deadlineAt&&date.getTime()>deadlineAt)return '';return visitLabel(date)};
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
    detail: `${categoryLabels[p.category]} · 마감 ${new Date(deadlineAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })}`,
    insight: p.aiInsight ?? "현재 판매 중인 마감 상품입니다.",
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
  const [tab, setTab] = useState<"home" | "map" | "purchases" | "mypage">(initialEntry==='businessRegistration'?"mypage":"home");
  const [sellerMode, setSellerMode] = useState(initialEntry==='seller');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("AI 추천순");
  const [sortOpen, setSortOpen] = useState(false);
  const [aiInfo, setAiInfo] = useState(false);
  const [quantity, setQuantity] = useState(2);
  const [now, setNow] = useState(Date.now());
  const [userLocation,setUserLocation]=useState<{lat:number;lng:number}|null>(null);
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(position=>setUserLocation({lat:position.coords.latitude,lng:position.coords.longitude}))},[]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (sellerMode) return;
    const businessType=businessTypeByCategory[category];
    const refreshProducts=()=>buyerApi
      .products({ size: 50, businessType })
      .then(async page => {
        if(page.content.length||!businessType)return page.content;
        const all=await buyerApi.products({size:50});
        return all.content.filter(product=>product.businessType===businessType);
      })
      .then(items => setProductItems(items.map(apiProductToCard)))
      .catch(() => setProductItems([]));
    void refreshProducts();
    const productInterval=setInterval(refreshProducts,5_000);
    buyerApi
      .wishlist({ size: 50 })
      .then((page) => setLiked(page.content.map((item) => item.id)))
      .catch(() => undefined);
    buyerApi
      .purchases({ size: 50 })
      .then((page) => setPurchases(page.content.map(apiPurchaseToItem)))
      .catch(() => undefined);
    return()=>clearInterval(productInterval);
  }, [tab, sellerMode, category]);
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
  }, [productItems, query, sort, now,userLocation]);
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
  const productCards = shown.map((p) => (
    <ProductCard
      key={p.id}
      product={p}
      liked={liked.includes(p.id)}
      onLike={() => toggleLike(p.id)}
      onBuy={() => setDetailProduct(p)}
    />
  ));
  if(detailProduct) return <BuyerProductDetail product={detailProduct} liked={liked.includes(detailProduct.id)} onBack={()=>setDetailProduct(null)} onLike={()=>toggleLike(detailProduct.id)} onBuy={()=>{setQuantity(1);setVisitTime(firstVisitTime(detailProduct.deadlineAt));setPurchase(detailProduct);setCheckout('order');setDetailProduct(null)}}/>;
  if(checkout==='order'&&purchase)return <OrderForm product={purchase} quantity={quantity} visitTime={visitTime} onQuantity={setQuantity} onVisitTime={setVisitTime} onBack={()=>{setCheckout(null);setPurchase(null)}} onNext={()=>setCheckout('payment')}/>;
  if(checkout==='payment'&&purchase)return <PaymentForm product={purchase} quantity={quantity} onBack={()=>setCheckout('order')} onPay={confirmPurchase}/>;
  if(paymentComplete) return <PaymentCompleteScreen onPurchases={()=>{setPaymentComplete(false);setTab('purchases');void buyerApi.purchases({size:50}).then(page=>setPurchases(page.content.map(apiPurchaseToItem)))}} onHome={()=>{setPaymentComplete(false);setTab('home')}}/>;
  if (sellerMode)
    return (
      <SellerHomeScreen
        onBuyerMode={() => {setSellerMode(false);setTab('home');}}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  if (tab === "mypage")
    return (
      <MyPageScreen
        initialBusinessRegistration={initialEntry==='businessRegistration'}
        onBusinessRegistered={onBusinessRegistered}
        onHome={() => setTab("home")}
        onMap={() => setTab("map")}
        onPurchases={() => setTab("purchases")}
        onSellerMode={() => setSellerMode(true)}
        onLogout={onLogout}
        onWithdraw={onWithdraw}
      />
    );
  if (tab === "purchases")
    return (
      <PurchaseHistoryScreen
        items={purchases}
        onHome={() => setTab("home")}
        onMap={() => setTab("map")}
        onMyPage={() => setTab("mypage")}
        onDelete={(id) => {
          void buyerApi
            .hidePurchase(id)
            .then(() => setPurchases((v) => v.filter((x) => x.id !== id)));
        }}
      />
    );
  if (tab === "map")
    return (
      <BuyerMapScreen
        onHome={() => setTab("home")}
        onPurchases={() => setTab("purchases")}
        onMyPage={() => setTab("mypage")}
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
          <View style={s.productGrid}>{productCards}</View>
        ) : (
          <Text style={s.empty}>검색 결과가 없습니다.</Text>
        )}
      </ScrollView>
      <BottomNavigation active="home" onSelect={setTab} />
    </View>
  );
}
function OrderForm({product,quantity,visitTime,onQuantity,onVisitTime,onBack,onNext}:{product:Product;quantity:number;visitTime:string;onQuantity:(v:number)=>void;onVisitTime:(v:string)=>void;onBack:()=>void;onNext:()=>void}){
  const [picker,setPicker]=useState(false);const times=useMemo(()=>{const values:string[]=[];const cursor=new Date();cursor.setSeconds(0,0);cursor.setMinutes(Math.ceil(cursor.getMinutes()/5)*5);const deadline=product.deadlineAt??cursor.getTime();while(cursor.getTime()<=deadline){values.push(visitLabel(cursor));cursor.setMinutes(cursor.getMinutes()+5)}return values},[product.deadlineAt]);
  // The time list is intentionally constrained by its containing bottom sheet.
  // @ts-ignore React Native accepts an optional style key generated below at runtime.
  return <View style={checkoutStyles.root}><CheckoutHeader title="주문하기" onBack={onBack}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={checkoutStyles.content}><Text style={checkoutStyles.sectionTitle}>상품 정보</Text><CheckoutProduct product={product}/><Text style={[checkoutStyles.sectionTitle,{marginTop:24}]}>주문 정보 작성</Text><Text style={checkoutStyles.label}>수량<Text style={checkoutStyles.required}> *</Text></Text><TextInput value={String(quantity)} onChangeText={v=>onQuantity(Math.max(1,Math.min(Number(product.remaining.replace(/[^0-9]/g,''))||99,Number(v.replace(/\D/g,''))||1)))} keyboardType="number-pad" style={checkoutStyles.input}/><Text style={checkoutStyles.label}>방문 시각<Text style={checkoutStyles.required}> *</Text></Text><Pressable disabled={!times.length} onPress={()=>setPicker(true)} style={checkoutStyles.input}><Text style={[checkoutStyles.inputText,!visitTime&&{color:colors.g400}]}>{visitTime||'선택 가능한 시간이 없습니다.'}</Text><ChevronDownIcon width={24} height={24} color={colors.g400}/></Pressable></ScrollView><View style={checkoutStyles.bottom}><Pressable disabled={!visitTime} onPress={onNext} style={[checkoutStyles.primaryButton,!visitTime&&checkoutStyles.disabled]}><Text style={[checkoutStyles.primaryText,!visitTime&&checkoutStyles.disabledText]}>다음</Text></Pressable></View><TimeOptionWheel visible={picker} value={visitTime} values={times} title="방문 시각 선택" onClose={()=>setPicker(false)} onApply={time=>{onVisitTime(time);setPicker(false)}}/></View>
}
function PaymentForm({product,quantity,onBack,onPay}:{product:Product;quantity:number;onBack:()=>void;onPay:()=>Promise<void>}){const [method,setMethod]=useState<string|null>(null);const [unsupported,setUnsupported]=useState(false);const total=money(product.price)*quantity;return <View style={checkoutStyles.root}><CheckoutHeader title="결제하기" onBack={onBack}/><View style={checkoutStyles.content}><Text style={checkoutStyles.sectionTitle}>결제 상품</Text><View style={checkoutStyles.paymentRows}><PayRow label="상품명" value={product.title}/><PayRow label="정가" value={product.original}/><PayRow label="할인가" value={product.price}/><PayRow label="구매 수량" value={`${quantity}개`}/><PayRow label="결제금액" value={`${total.toLocaleString()}원`} bold/></View><View style={checkoutStyles.totalPay}><Text style={checkoutStyles.sectionTitle}>총 결제금액</Text><Text style={checkoutStyles.totalValue}>{total.toLocaleString()}원</Text></View><Text style={[checkoutStyles.sectionTitle,{marginTop:32}]}>결제 수단</Text><View style={checkoutStyles.methods}>{['토스페이','네이버페이','카카오페이'].map(value=><Pressable key={value} onPress={()=>setMethod(value)} style={[checkoutStyles.method,method===value&&checkoutStyles.methodOn]}><Text style={checkoutStyles.methodLogo}>{value==='토스페이'?'toss pay':value==='네이버페이'?'N pay':'● pay'}</Text><Text style={checkoutStyles.methodName}>{value}</Text></Pressable>)}</View></View><View style={checkoutStyles.bottom}><Pressable disabled={!method} onPress={()=>method==='토스페이'?void onPay():setUnsupported(true)} style={[checkoutStyles.primaryButton,!method&&checkoutStyles.disabled]}><Text style={[checkoutStyles.primaryText,!method&&checkoutStyles.disabledText]}>결제하기</Text></Pressable></View><Modal transparent visible={unsupported} animationType="fade"><View style={checkoutStyles.alertOverlay}><View style={checkoutStyles.alert}><Text style={checkoutStyles.alertIcon}>ⓘ</Text><Text style={checkoutStyles.alertText}>아직 지원하지 않는 결제수단 입니다.</Text><Pressable onPress={()=>setUnsupported(false)} style={checkoutStyles.primaryButton}><Text style={checkoutStyles.primaryText}>확인</Text></Pressable></View></View></Modal></View>}
function CheckoutHeader({title,onBack}:{title:string;onBack:()=>void}){return <View style={checkoutStyles.header}><Pressable onPress={onBack}><ChevronLeftIcon width={24} height={24} color={colors.black}/></Pressable><Text style={checkoutStyles.headerTitle}>{title}</Text><View style={{width:24}}/></View>}
function CheckoutProduct({product}:{product:Product}){return <View style={checkoutStyles.productBox}><Text style={checkoutStyles.productShop}>{product.shop}</Text><Text style={checkoutStyles.productDetail}>{product.detail}</Text><View style={checkoutStyles.productPriceRow}><Text style={checkoutStyles.productOriginal}>{product.original}</Text><Text style={checkoutStyles.productPrice}><Text style={checkoutStyles.saleLabel}>[할인가] </Text>{product.price}</Text></View><Text style={checkoutStyles.productDetail}>{product.remaining}</Text></View>}
function PayRow({label,value,bold}:{label:string;value:string;bold?:boolean}){return <View style={checkoutStyles.payRow}><Text style={checkoutStyles.payLabel}>{label}</Text><Text numberOfLines={1} style={[checkoutStyles.payValue,bold&&checkoutStyles.payBold]}>{value}</Text></View>}

function BuyerProductDetail({product,liked,onBack,onLike,onBuy}:{product:Product;liked:boolean;onBack:()=>void;onLike:()=>void;onBuy:()=>void}) {
  const images=product.imageUrls??[];
  const [index,setIndex]=useState(0);
  const {width}=useWindowDimensions();const frameWidth=Math.min(width,402);
  return <View style={[detailStyles.root,{width:frameWidth,alignSelf:'center'}]}>
    <View style={detailStyles.hero}>{images.length?<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>setIndex(Math.round(event.nativeEvent.contentOffset.x/event.nativeEvent.layoutMeasurement.width))}>{images.map((url,i)=><Image key={`${url}-${i}`} source={{uri:url}} resizeMode="cover" style={[detailStyles.heroImage,{width:frameWidth}]}/>)}</ScrollView>:<View style={detailStyles.fallback}/>}<View style={detailStyles.heroActions}><Pressable onPress={onBack} style={detailStyles.circle}><ChevronLeftIcon width={24} height={24} color={colors.black}/></Pressable><Pressable onPress={onLike} style={detailStyles.circle}><Text style={[detailStyles.heart,liked&&detailStyles.heartLiked]}>♥</Text></Pressable></View>{images.length>1?<View style={detailStyles.dots}>{images.map((_,i)=><View key={i} style={[detailStyles.dot,index===i&&detailStyles.dotOn]}/>)}</View>:null}</View>
    <View style={detailStyles.panel}>
      <View style={detailStyles.titleRow}><View style={detailStyles.nameRow}><Text numberOfLines={1} style={detailStyles.name}>{product.title}</Text>{product.urgent?<View style={detailStyles.tag}><Text style={detailStyles.tagText}>마감임박</Text></View>:null}</View><Text style={detailStyles.discount}>{product.discount}</Text></View>
      <View style={detailStyles.locationRow}><Text style={detailStyles.shop}>{product.shop}</Text><Text numberOfLines={1} style={detailStyles.location}>{product.location}</Text></View>
      <DetailRow label="상품정보" value={product.detail.split('·')[0].trim()}/><DetailRow label="마감시각" value={product.deadlineAt?new Date(product.deadlineAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}):'-'}/><DetailRow label="잔여수량" value={product.remaining.replace(/[^0-9]/g,'')||'-'}/>
      <View style={detailStyles.priceRow}><Text style={detailStyles.original}>{product.original}</Text><View style={detailStyles.sale}><Text style={detailStyles.saleLabel}>[할인가]</Text><Text style={detailStyles.price}>{product.price}</Text></View></View>
      <View style={detailStyles.insight}><Text style={detailStyles.sun}>☼</Text><Text style={detailStyles.insightText}>{product.insight}</Text></View>
    </View>
    <View style={detailStyles.bottom}><Pressable onPress={onBuy} style={detailStyles.buy}><Text style={detailStyles.buyText}>구매하기</Text></Pressable></View>
  </View>;
}
const checkoutStyles=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{fontSize:16,fontWeight:'600',color:colors.black},content:{padding:16,paddingBottom:110},sectionTitle:{fontSize:18,fontWeight:'600',color:colors.black,marginBottom:10},productBox:{borderWidth:1,borderColor:colors.g300,borderRadius:20,paddingHorizontal:12,paddingVertical:16,gap:5},productShop:{fontSize:14,fontWeight:'600',color:colors.g800},productDetail:{fontSize:12,color:colors.g600},productPriceRow:{marginTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},productOriginal:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},productPrice:{fontSize:20,fontWeight:'600',color:colors.info},saleLabel:{fontSize:10,fontWeight:'400'},label:{fontSize:14,fontWeight:'500',marginTop:16,marginBottom:8},required:{color:colors.primary500},input:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:8,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',fontSize:16,color:colors.black},inputText:{fontSize:16,color:colors.black},bottom:{position:'absolute',left:16,right:16,bottom:34},primaryButton:{height:56,borderRadius:12,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:16,fontWeight:'600',color:colors.white},disabled:{backgroundColor:colors.g200},disabledText:{color:colors.g400},sheetOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',justifyContent:'flex-end'},timeSheet:{backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,paddingBottom:34},handle:{width:60,height:4,borderRadius:2,backgroundColor:colors.g200,alignSelf:'center',marginBottom:18},sheetTitle:{fontSize:18,fontWeight:'600',marginBottom:8},timeItem:{height:48,borderBottomWidth:1,borderBottomColor:colors.g200,alignItems:'center',justifyContent:'center'},timeText:{fontSize:16,color:colors.g500},timeSelected:{fontSize:20,fontWeight:'600',color:colors.g800},paymentRows:{borderTopWidth:1,borderBottomWidth:1,borderColor:colors.g200,paddingVertical:8},payRow:{height:28,flexDirection:'row',alignItems:'center'},payLabel:{width:128,fontSize:14,color:colors.g600},payValue:{flex:1,textAlign:'right',fontSize:14,color:colors.black},payBold:{fontWeight:'600'},totalPay:{height:96,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.g200},totalValue:{fontSize:20,fontWeight:'600',color:colors.info},methods:{flexDirection:'row',gap:12},method:{flex:1,height:98,borderWidth:1,borderColor:colors.g200,borderRadius:12,alignItems:'center',justifyContent:'center',gap:10},methodOn:{borderColor:colors.primary500},methodLogo:{fontSize:12,fontWeight:'700'},methodName:{fontSize:14,color:colors.black},alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',alignItems:'center',justifyContent:'center',padding:16},alert:{width:'100%',maxWidth:370,borderRadius:20,backgroundColor:colors.white,padding:20,gap:24},alertIcon:{fontSize:22,textAlign:'center'},alertText:{fontSize:16,fontWeight:'600',textAlign:'center'}});
(checkoutStyles as any).timeList={maxHeight:260};
(checkoutStyles as any).timeSheet={...checkoutStyles.timeSheet,width:'100%',maxWidth:402,alignSelf:'center',maxHeight:360};
function DetailRow({label,value}:{label:string;value:string}){return <View style={detailStyles.detailRow}><Text style={detailStyles.detailLabel}>{label}</Text><Text style={detailStyles.detailValue}>{value}</Text></View>}

const detailStyles=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},hero:{height:319,backgroundColor:colors.g100,position:'relative'},heroImage:{width:402,height:319},fallback:{flex:1,backgroundColor:colors.g100},heroActions:{position:'absolute',left:16,right:16,top:60,flexDirection:'row',justifyContent:'space-between'},circle:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(230,230,229,.72)',alignItems:'center',justifyContent:'center'},heart:{fontSize:24,color:colors.white},heartLiked:{color:colors.primary500},dots:{position:'absolute',bottom:40,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:8},dot:{width:6,height:6,borderRadius:3,backgroundColor:colors.g300},dotOn:{backgroundColor:colors.white},panel:{minHeight:494,marginTop:-29,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:colors.white,padding:16,paddingBottom:100},titleRow:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},nameRow:{flex:1,flexDirection:'row',alignItems:'center',gap:12},name:{maxWidth:230,fontSize:20,fontWeight:'600',color:colors.black},tag:{paddingHorizontal:4,paddingVertical:2,borderRadius:4,backgroundColor:colors.primary500},tagText:{fontSize:12,fontWeight:'600',color:colors.white},discount:{fontSize:14,fontWeight:'600',color:colors.info},locationRow:{height:32,flexDirection:'row',alignItems:'center',gap:12},shop:{fontSize:14,fontWeight:'600',color:'#2b2b29'},location:{flex:1,fontSize:12,color:colors.g600},detailRow:{height:32,flexDirection:'row',alignItems:'center'},detailLabel:{width:128,fontSize:12,color:colors.g600},detailValue:{flex:1,textAlign:'right',fontSize:14,fontWeight:'500',color:colors.black},priceRow:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},sale:{flexDirection:'row',alignItems:'center',gap:6},saleLabel:{fontSize:10,color:colors.info},price:{fontSize:20,fontWeight:'600',color:colors.info},insight:{marginTop:8,minHeight:69,paddingHorizontal:8,paddingVertical:16,borderRadius:8,backgroundColor:'rgba(255,237,204,.5)',flexDirection:'row',alignItems:'flex-start',gap:8},sun:{fontSize:24,color:colors.primary500},insightText:{flex:1,fontSize:12,lineHeight:16,fontWeight:'600',color:colors.primary500},bottom:{position:'absolute',left:16,right:16,bottom:34},buy:{height:56,borderRadius:12,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},buyText:{fontSize:16,fontWeight:'600',color:colors.white}});

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
