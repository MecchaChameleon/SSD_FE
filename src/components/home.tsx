import React from 'react';
import { Image,Modal,Platform,Pressable,StatusBar,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors,fonts,radius } from '../theme';
import { Card,Tag } from './ui'; import { NotificationCenter } from './notifications';
import { DeviceFrame } from './DeviceFrame';
import { notificationApi } from '../api';
import BellIcon from '../../icon/bell.svg'; import HeartIcon from '../../icon/heart.svg'; import HomeIcon from '../../icon/home.svg'; import MapPinIcon from '../../icon/map_pin.svg'; import MapPinSolidIcon from '../../icon/map_pin_solid.svg'; import PaymentIcon from '../../icon/reservation.svg'; import LoaderIcon from '../../icon/loader.svg'; import UserIcon from '../../icon/user.svg';
import BrandLogo from '../../icon/로컬타임_로고1 1.svg';

export type Product={id:number;title:string;description?:string;discount:string;shop:string;location:string;detail:string;insight:string;original:string;price:string;remaining:string;imageUrls?:string[];urgent?:boolean;soldOutUrgent?:boolean;qty?:number;deadlineAt?:number;distanceMeters?:number;discountRate?:number;minPrice?:number;currentPrice?:number;isMaxDiscount?:boolean;lat?:number|null;lng?:number|null;createdAt?:string};
export type PaymentDisplayStatus='pending'|'accepted'|'refunded';

export type ProductBadgeInfo = {
  text: string;
  type: 'soldOut' | 'urgent' | 'maxDiscount';
};

export function getBadgeInfo(product: Product): ProductBadgeInfo | null {
  const qtyCount = product.qty ?? (product.remaining ? Number(product.remaining.replace(/[^0-9]/g, '')) : undefined);
  const isSoldOut = product.soldOutUrgent || (qtyCount !== undefined && qtyCount > 0 && qtyCount < 5);
  const isDeadline = product.urgent || (product.deadlineAt !== undefined && product.deadlineAt > Date.now() && product.deadlineAt - Date.now() <= 60 * 60 * 1000);
  const isMaxDiscount = product.isMaxDiscount || (product.minPrice !== undefined && product.currentPrice !== undefined && product.currentPrice <= product.minPrice);

  if (isSoldOut) {
    return { text: qtyCount ? `매진임박 ${qtyCount}개` : '매진임박', type: 'soldOut' };
  }
  if (isDeadline) {
    return { text: '마감임박', type: 'urgent' };
  }
  if (isMaxDiscount) {
    return { text: '최대할인', type: 'maxDiscount' };
  }
  return null;
}

export function useAppHeaderHeight() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  return {
    topInset,
    headerHeight: 56 + topInset,
  };
}

export function useAppBottomNavHeight() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const bottomOffset = Math.max(20, bottomInset + 8);
  const navTotalHeight = 64 + bottomOffset;
  return {
    bottomInset,
    bottomOffset,
    navTotalHeight,
  };
}

export function NotificationBell({role='buyer',size=20}:{role?:'buyer'|'seller';size?:number}){const[open,setOpen]=React.useState(false);const[hasUnread,setHasUnread]=React.useState(false);const refresh=React.useCallback(()=>notificationApi.list({filter:'UNREAD',size:1}).then(page=>setHasUnread(page.content.length>0)).catch(()=>setHasUnread(false)),[]);React.useEffect(()=>{void refresh()},[refresh]);const close=()=>{setOpen(false);void refresh()};return <><Pressable accessibilityRole="button" accessibilityLabel="알림" hitSlop={10} onPress={()=>setOpen(true)}><BellIcon width={size} height={size} color={colors.g700}/>{hasUnread?<View style={{position:'absolute',right:-1,top:-1,width:7,height:7,borderRadius:4,backgroundColor:colors.danger,borderWidth:1,borderColor:colors.white}}/>:null}</Pressable><Modal visible={open} animationType="fade" onRequestClose={close}><DeviceFrame><NotificationCenter role={role} onBack={close}/></DeviceFrame></Modal></>}
export function AppHeader({role='buyer',showBell=true}:{role?:'buyer'|'seller';showBell?:boolean}){
  const { topInset } = useAppHeaderHeight();
  return (
    <View style={[s.headerContainer, { paddingTop: topInset }]}>
      <View style={s.header}>
        <View style={s.logo}><BrandLogo width="100%" height="100%" viewBox="140 190 1220 320"/></View>
        {showBell?<NotificationBell role={role}/>:null}
      </View>
    </View>
  );
}

export function ProductCard({product,liked,onLike,onBuy,status,onDelete,onReason,purchaseQuantity,totalAmount,purchasedAt}:{product:Product;liked:boolean;onLike:()=>void;onBuy:()=>void;status?:PaymentDisplayStatus;onDelete?:()=>void;onReason?:()=>void;purchaseQuantity?:number;totalAmount?:number;purchasedAt?:string}){
 const state=status?{pending:['판매자 확인 대기',colors.primary500,'rgba(243,171,36,.15)'],accepted:['판매 수락',colors.success,'rgba(102,219,90,.15)'],refunded:['환불 완료',colors.danger,'rgba(235,64,49,.15)']}[status]:null;
 const badgeInfo = getBadgeInfo(product);

 if(!status) return (
   <Pressable onPress={onBuy} style={compact.productCard}>
     <View style={compact.productImageWrap}>
       {product.imageUrls?.[0]?<Image source={{uri:product.imageUrls[0]}} resizeMode="cover" style={compact.productImage}/>:<View style={compact.imageFallback}/>}
       {badgeInfo ? (
         <View style={compact.urgent}>
           <Text style={compact.urgentText}>{badgeInfo.text}</Text>
         </View>
       ) : null}
       <Pressable accessibilityLabel="찜하기" onPress={event=>{event.stopPropagation();onLike()}} style={compact.heartCircle}>
         <HeartIcon width={22} height={22} color={liked?colors.primary500:colors.white} fill={liked?colors.primary500:colors.white}/>
       </Pressable>
     </View>
     <View style={compact.productContents}>
       <Text numberOfLines={2} style={compact.productTitle}>{product.title}</Text>
       <View style={compact.storeRow}>
         <MapPinSolidIcon width={14} height={14} color={colors.g500}/>
         <Text numberOfLines={1} style={compact.productShop}>{product.shop}</Text>
       </View>
       <Text style={compact.productPrice}>{product.price}</Text>
     </View>
   </Pressable>
 );

 return (
   <Card style={s.card}>
     <View style={s.cardHead}>
       <Pressable accessibilityRole="button" accessibilityLabel="찜하기" accessibilityState={{selected:liked}} onPress={onLike}>
         <HeartIcon width={24} height={24} color={liked?colors.primary500:colors.g300} fill={liked?colors.primary500:'none'}/>
       </Pressable>
       {state?<View style={s.stateRow}><Text style={s.stateLabel}>결제상태 |</Text><View style={[s.stateTag,{borderColor:state[1],backgroundColor:state[2]}]}><Text style={[s.stateText,{color:state[1]}]}>{state[0]}</Text></View></View>:null}
     </View>
     <View style={s.body}>
       <View style={s.titleRow}><Text numberOfLines={1} style={s.title}>{product.title}</Text><Text style={s.discount}>{product.discount}</Text></View>
       <View style={s.metaRow}><Text style={s.shop}>{product.shop}</Text><Text style={s.location}>{product.location}</Text></View>
       <View style={s.metaRow}><Text style={s.detail}>{product.detail}</Text>{badgeInfo?<Tag tone="info">{badgeInfo.text}</Tag>:null}</View>
       {!status&&product.insight?<View style={s.insight}><LoaderIcon width={24} height={24} color={colors.primary500}/><Text style={s.insightText}>{product.insight}</Text></View>:null}
       <View style={s.priceRow}><Text style={s.original}>{product.original}</Text>{status?<View style={s.salePrice}><Text style={s.saleLabel}>[할인가]</Text><Text style={s.infoPrice}>{product.price}</Text></View>:<Text style={s.price}>{product.price}</Text>}</View>
       <Text style={s.remaining}>{product.remaining}</Text>
       {status?<><View style={s.purchaseSummary}><View><Text style={s.purchaseLabel}>구매 수량</Text><Text style={s.purchaseValue}>{purchaseQuantity}개</Text></View><View style={s.purchaseDivider}/><View style={s.purchaseTotal}><Text style={s.purchaseLabel}>총 결제 금액</Text><Text style={s.purchaseTotalValue}>{totalAmount?.toLocaleString()}원</Text></View></View>{purchasedAt?<Text style={s.purchasedAt}>결제 일시 {purchasedAt}</Text>:null}</>:null}
     </View>
     {status==='refunded'?<View style={s.actions}><Action label="환불 사유 확인" onPress={onReason}/><Action label="삭제" onPress={onDelete} muted/></View>:status==='accepted'?<OneButton label="내역 삭제" onPress={onDelete} muted/>:status?null:<OneButton label="구매하기" onPress={onBuy}/>}
   </Card>
 );
}
function Action({label,onPress,muted}:{label:string;onPress?:()=>void;muted?:boolean}){return <Pressable onPress={onPress} style={[s.action,muted?s.secondary:s.primary]}><Text style={s.buttonText}>{label}</Text></Pressable>}
function OneButton({label,onPress,muted}:{label:string;onPress?:()=>void;muted?:boolean}){return <Pressable onPress={onPress} style={[s.oneButton,muted?s.secondary:s.primary]}><Text style={s.buttonText}>{label}</Text></Pressable>}
const compact=StyleSheet.create({productCard:{width:'48.4%',borderWidth:1,borderColor:colors.g200,borderRadius:16,overflow:'hidden',backgroundColor:colors.white},productImageWrap:{height:215,position:'relative',backgroundColor:colors.g100},productImage:{width:'100%',height:'100%'},imageFallback:{flex:1,backgroundColor:colors.g100},urgent:{position:'absolute',left:10,top:10,paddingHorizontal:4,paddingVertical:2,borderRadius:4,backgroundColor:colors.primary500},soldOutTag:{backgroundColor:colors.primary500},urgentText:{fontSize:12,fontFamily:fonts.semibold,fontWeight:'600',color:colors.white},heartCircle:{position:'absolute',right:10,top:10,width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.65)',alignItems:'center',justifyContent:'center'},productContents:{paddingHorizontal:8,paddingTop:12,paddingBottom:12,gap:6},productTitle:{minHeight:40,fontSize:14,lineHeight:20,fontFamily:fonts.semibold,fontWeight:'600',color:colors.black},storeRow:{flexDirection:'row',alignItems:'center',gap:2},productShop:{flex:1,fontSize:10,fontFamily:fonts.regular,color:colors.g600},productPrice:{marginTop:4,fontSize:16,fontFamily:fonts.semibold,fontWeight:'600',color:colors.info}});
const navItems=[{label:'홈',Icon:HomeIcon},{label:'지도',Icon:MapPinIcon},{label:'결제내역',Icon:PaymentIcon},{label:'좋아요',Icon:HeartIcon},{label:'마이페이지',Icon:UserIcon}];
export type HomeTab='home'|'map'|'purchases'|'likes'|'mypage';
const navTabs:HomeTab[]=['home','map','purchases','likes','mypage'];
export const floatingNavigationStyles=StyleSheet.create({
 nav:{position:'absolute',left:16,right:16,bottom:20,height:64,paddingHorizontal:12,backgroundColor:'rgba(255,255,255,.78)',borderRadius:radius.pill,flexDirection:'row',justifyContent:'space-between',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:.05,shadowRadius:10,elevation:4},
 item:{flex:1,alignItems:'center',justifyContent:'center',gap:8},
 label:{fontSize:12,fontFamily:fonts.semibold,fontWeight:'600'},
});
export function BottomNavigation({active='home',onSelect}:{active?:HomeTab;onSelect?:(tab:HomeTab)=>void}){
  const { bottomOffset } = useAppBottomNavHeight();
  return <View style={[floatingNavigationStyles.nav, { bottom: bottomOffset }]}>{navItems.map(({label,Icon},i)=>{const tab=navTabs[i];const color=active===tab?colors.primary500:colors.g400;return <Pressable key={label} onPress={()=>onSelect?.(tab)} style={floatingNavigationStyles.item}><Icon width={24} height={24} color={color}/><Text style={[floatingNavigationStyles.label,{color}]}>{label}</Text></Pressable>})}</View>;
}
const s=StyleSheet.create({headerContainer:{backgroundColor:colors.white,borderBottomWidth:1,borderBottomColor:colors.g200},header:{height:56,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},logo:{width:99,height:24},card:{paddingHorizontal:12,paddingVertical:16,marginBottom:8,gap:16},cardHead:{paddingBottom:16,borderBottomWidth:1,borderBottomColor:colors.g200,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},stateRow:{flexDirection:'row',alignItems:'center',gap:6},stateLabel:{fontSize:16,fontWeight:'600',color:colors.g300},stateTag:{paddingHorizontal:8,paddingVertical:6,borderRadius:8,borderWidth:2},stateText:{fontSize:14,fontWeight:'600'},body:{paddingBottom:16,borderBottomWidth:1,borderBottomColor:colors.g200,gap:6},titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},title:{flex:1,fontSize:20,fontWeight:'600',color:colors.black},discount:{fontSize:16,fontWeight:'600',color:colors.info},metaRow:{flexDirection:'row',alignItems:'center',gap:8},shop:{fontSize:14,fontWeight:'600',color:colors.g800},location:{fontSize:12,color:colors.g600},detail:{fontSize:12,color:colors.g600},insight:{marginTop:2,minHeight:64,paddingHorizontal:8,paddingVertical:16,borderRadius:radius.sm,backgroundColor:'rgba(255,237,204,.5)',flexDirection:'row',alignItems:'center',gap:8},insightText:{flex:1,fontSize:12,fontWeight:'600',lineHeight:16,color:colors.primary500},priceRow:{marginTop:3,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},salePrice:{flexDirection:'row',alignItems:'center',gap:6},saleLabel:{fontSize:10,color:colors.info},infoPrice:{fontSize:20,fontWeight:'600',color:colors.info},price:{fontSize:20,fontWeight:'600',color:colors.danger},remaining:{fontSize:12,color:colors.g600},purchaseSummary:{marginTop:12,paddingTop:14,borderTopWidth:1,borderTopColor:colors.g200,flexDirection:'row',alignItems:'center'},purchaseLabel:{fontSize:12,color:colors.g500},purchaseValue:{marginTop:4,fontSize:15,fontWeight:'600',color:colors.g800},purchaseDivider:{width:1,height:36,marginHorizontal:18,backgroundColor:colors.g200},purchaseTotal:{flex:1,alignItems:'flex-end'},purchaseTotalValue:{marginTop:4,fontSize:17,fontWeight:'700',color:colors.black},purchasedAt:{marginTop:8,fontSize:12,color:colors.g600,textAlign:'right'},actions:{flexDirection:'row',gap:16},action:{flex:1,height:56,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},oneButton:{height:56,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},primary:{backgroundColor:colors.primary500},secondary:{backgroundColor:colors.g300},buttonText:{color:colors.white,fontSize:16,lineHeight:24,fontWeight:'600'},nav:{position:'absolute',left:16,right:16,bottom:20,height:64,paddingHorizontal:12,backgroundColor:'rgba(255,255,255,.78)',borderRadius:radius.pill,flexDirection:'row',justifyContent:'space-between',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.05,shadowRadius:10,elevation:4},navItem:{flex:1,alignItems:'center',justifyContent:'center'},navItemContent:{alignItems:'center',gap:8},navActiveLayer:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',gap:8},navLabel:{fontSize:12,fontFamily:fonts.semibold,fontWeight:'600'}});
