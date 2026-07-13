import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { buyerApi, MapPin, Product } from '../api';
import { BottomNavigation } from '../components/home';
import { colors, radius } from '../theme';
import CrosshairIcon from '../../icon/crosshair.svg';
import HeartIcon from '../../icon/heart.svg';
import LoaderIcon from '../../icon/loader.svg';

declare global { interface Window { kakao: any; } }

const categoryLabel:Record<Product['category'],string>={SAME_DAY_INVENTORY:'당일 재고',EMPTY_TIME_RESOURCE:'빈 시간대 자원',SAME_DAY_ROOM:'당일 공실',TOUR_REMAINDER:'이동/관광 잔여 상품'};
const jsKey=process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY;
const addressCoordinateCache=new Map<string,{latitude:number;longitude:number}|null>();
const pendingGeocodes=new Map<string,Promise<{latitude:number;longitude:number}|null>>();

function geocodeAddress(kakao:any,geocoder:any,address:string){
  if(addressCoordinateCache.has(address))return Promise.resolve(addressCoordinateCache.get(address)??null);
  const pending=pendingGeocodes.get(address);if(pending)return pending;
  const request=new Promise<{latitude:number;longitude:number}|null>(resolve=>{
    geocoder.addressSearch(address,(result:any[],status:string)=>{
      const coordinate=status===kakao.maps.services.Status.OK?{latitude:Number(result[0].y),longitude:Number(result[0].x)}:null;
      addressCoordinateCache.set(address,coordinate);pendingGeocodes.delete(address);resolve(coordinate);
    });
  });
  pendingGeocodes.set(address,request);return request;
}

function loadKakao(){
  if(Platform.OS!=='web'||typeof document==='undefined')return Promise.reject(new Error('웹 지도만 지원됩니다.'));
  if(window.kakao?.maps)return new Promise<void>(resolve=>window.kakao.maps.load(resolve));
  if(!jsKey)return Promise.reject(new Error('EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.'));
  return new Promise<void>((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>('script[data-localtime-kakao-map]');const done=()=>window.kakao.maps.load(resolve);if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.')),{once:true});return}const script=document.createElement('script');script.dataset.localtimeKakaoMap='true';script.async=true;script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`;script.onload=done;script.onerror=()=>reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));document.head.appendChild(script)});
}

export function BuyerMapScreen({onHome,onReservations,onMyPage,onBuy,onReserve}:{onHome:()=>void;onReservations:()=>void;onMyPage:()=>void;onBuy:(product:Product)=>void;onReserve:(product:Product)=>void}){
  const mapElement=useRef<any>(null);const mapObject=useRef<any>(null);const overlays=useRef<any[]>([]);const[selected,setSelected]=useState<Product|null>(null);const[error,setError]=useState('');
  const sheetTranslateY=useRef(new Animated.Value(0)).current;
  const closeSheet=()=>Animated.timing(sheetTranslateY,{toValue:520,duration:220,useNativeDriver:true}).start(()=>{setSelected(null);sheetTranslateY.setValue(0)});
  const sheetPan=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>gesture.dy>5&&Math.abs(gesture.dy)>Math.abs(gesture.dx),
    onPanResponderMove:(_,gesture)=>sheetTranslateY.setValue(Math.max(0,gesture.dy)),
    onPanResponderRelease:(_,gesture)=>{if(gesture.dy>90||gesture.vy>.65)closeSheet();else Animated.spring(sheetTranslateY,{toValue:0,tension:90,friction:12,useNativeDriver:true}).start()},
    onPanResponderTerminate:()=>Animated.spring(sheetTranslateY,{toValue:0,tension:90,friction:12,useNativeDriver:true}).start(),
  })).current;
  useEffect(()=>{let disposed=false;loadKakao().then(async()=>{if(disposed||!mapElement.current)return;const kakao=window.kakao;const map=new kakao.maps.Map(mapElement.current,{center:new kakao.maps.LatLng(33.3938,126.5627),level:9});mapObject.current=map;
    kakao.maps.event.addListener(map,'click',()=>setSelected(null));
    let rendering=false,renderAgain=false,idleTimer:ReturnType<typeof setTimeout>|null=null;
    const render=async()=>{
      if(rendering){renderAgain=true;return;} rendering=true;
      try {
      const bounds=map.getBounds();
      const query={swLat:bounds.getSouthWest().getLat(),swLng:bounds.getSouthWest().getLng(),neLat:bounds.getNorthEast().getLat(),neLng:bounds.getNorthEast().getLng()};
      let pins=await buyerApi.mapPins(query);
      const products=await buyerApi.products({size:50});
      const known=new Set(pins.map(pin=>pin.id));
      const geocoder=new kakao.maps.services.Geocoder();
      const missing=products.content.filter(product=>!known.has(product.id)&&!!product.address);
      const geocoded=await Promise.all(missing.map(async product=>{
        const coordinate=await geocodeAddress(kakao,geocoder,product.address!);if(!coordinate)return null;
        return {id:product.id,name:product.name,businessName:product.businessName??'',category:product.category,originalPrice:product.price,currentPrice:product.currentPrice,discountRate:product.discountRate??0,...coordinate,address:product.address,deadline:product.deadline,urgent:!!product.urgent} as MapPin;
      }));
      pins=[...pins,...geocoded.filter((pin):pin is MapPin=>pin!==null)];
      overlays.current.forEach(item=>item.setMap(null));
      overlays.current=pins.map(pin=>{const content=document.createElement('button');content.type='button';content.style.cssText='max-width:142px;height:32px;padding:4px 9px 4px 4px;border:0;border-radius:80px;background:#fff;box-shadow:2px 2px 3px rgba(0,0,0,.1);display:flex;align-items:center;gap:6px;cursor:pointer;';const clock=document.createElement('span');clock.textContent='◷';clock.style.cssText='width:24px;height:24px;border-radius:12px;background:#f3ab24;color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;';const label=document.createElement('span');label.textContent=pin.name;label.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#111;';content.append(clock,label);content.onclick=()=>buyerApi.product(pin.id).then(setSelected);const overlay=new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(pin.latitude,pin.longitude),content,yAnchor:.5});overlay.setMap(map);return overlay});
      } finally { rendering=false;if(renderAgain&&!disposed){renderAgain=false;void render();} }
    };
    await render();
    kakao.maps.event.addListener(map,'idle',()=>{if(idleTimer)clearTimeout(idleTimer);idleTimer=setTimeout(()=>void render().catch(()=>undefined),300)});
    navigator.geolocation?.getCurrentPosition(position=>{
      if(disposed)return;
      const here=new kakao.maps.LatLng(position.coords.latitude,position.coords.longitude);
      map.setCenter(here);
      const dot=document.createElement('div');
      dot.style.cssText='width:20px;height:20px;border:4px solid white;border-radius:50%;background:#307fe7;box-shadow:0 0 0 2px rgba(48,127,231,.35)';
      const overlay=new kakao.maps.CustomOverlay({position:here,content:dot});
      overlay.setMap(map);
      overlays.current.push(overlay);
    });
  }).catch(cause=>setError(cause instanceof Error?cause.message:'지도를 불러오지 못했습니다.'));
  return()=>{disposed=true;overlays.current.forEach(item=>item.setMap(null));};
  },[]);
  const currentLocation=()=>navigator.geolocation?.getCurrentPosition(position=>mapObject.current?.panTo(new window.kakao.maps.LatLng(position.coords.latitude,position.coords.longitude)));
  return <View style={s.root}><View ref={mapElement} style={s.map}/>{error?<View style={s.error}><Text style={s.errorTitle}>카카오 지도를 표시할 수 없습니다.</Text><Text style={s.errorText}>{error}</Text></View>:null}<Pressable style={[s.locationButton,selected&&s.locationButtonRaised]} onPress={currentLocation}><CrosshairIcon width={24} height={24} color={colors.g500}/></Pressable>{selected?<Animated.View {...sheetPan.panHandlers} style={[s.sheetGesture,{transform:[{translateY:sheetTranslateY}]}]}><ProductSheet product={selected} onClose={closeSheet} onBuy={()=>onBuy(selected)} onReserve={()=>onReserve(selected)}/></Animated.View>:null}<BottomNavigation active="map" onSelect={tab=>tab==='home'?onHome():tab==='reservations'?onReservations():tab==='mypage'?onMyPage():undefined}/></View>
}

function ProductSheet({product,onClose,onBuy,onReserve}:{product:Product;onClose:()=>void;onBuy:()=>void;onReserve:()=>void}){const discount=product.discountRate??Math.round((1-product.currentPrice/product.price)*100);const urgent=new Date(product.deadline).getTime()-Date.now()<=3600000;return <View style={s.sheet}><Pressable style={s.handleTouch} onPress={onClose}><View style={s.handle}/></Pressable><View style={s.productCard}><HeartIcon width={24} height={24} color={colors.g300}/><View style={s.divider}/><View style={s.titleRow}><Text numberOfLines={1} style={s.title}>{product.name}</Text><Text style={s.discount}>{discount}%</Text></View><View style={s.meta}><Text style={s.shop}>{product.businessName}</Text><Text numberOfLines={1} style={s.address}>{product.address}</Text></View><View style={s.meta}><Text style={s.address}>{categoryLabel[product.category]} · 마감 {new Date(product.deadline).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</Text>{urgent?<Text style={s.urgent}>마감임박</Text>:null}</View><View style={s.insight}><LoaderIcon width={24} height={24} color={colors.primary500}/><Text style={s.insightText}>{product.aiInsight??'현재 판매 중인 할인 상품입니다. 마감 전에 확인해 보세요!'}</Text></View><View style={s.priceRow}><Text style={s.original}>{product.price.toLocaleString()}원</Text><Text style={s.price}>{product.currentPrice.toLocaleString()}원</Text></View><Text style={s.remaining}>잔여수량 {product.qty}개</Text><View style={s.actions}><Pressable style={s.buy} onPress={onBuy}><Text style={s.actionText}>즉시 구매</Text></Pressable><Pressable style={s.reserve} onPress={onReserve}><Text style={s.actionText}>예약하기</Text></Pressable></View></View></View>}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#eef1f2',overflow:'hidden'},map:{...StyleSheet.absoluteFillObject,bottom:66},error:{position:'absolute',top:'38%',left:24,right:24,padding:20,borderRadius:radius.md,backgroundColor:colors.white,alignItems:'center',gap:8},errorTitle:{fontSize:16,fontWeight:'600'},errorText:{fontSize:12,color:colors.g500,textAlign:'center'},locationButton:{position:'absolute',right:16,bottom:82,width:48,height:48,borderRadius:24,backgroundColor:colors.white,alignItems:'center',justifyContent:'center',elevation:5,boxShadow:'2px 2px 3px rgba(0,0,0,.1)'},locationButtonRaised:{bottom:468},sheetGesture:{...StyleSheet.absoluteFillObject,pointerEvents:'box-none'},sheet:{position:'absolute',left:0,right:0,bottom:66,maxHeight:430,padding:12,paddingBottom:16,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:colors.white},handleTouch:{height:16,alignItems:'center'},handle:{width:60,height:4,borderRadius:2,backgroundColor:colors.g200},productCard:{borderWidth:1,borderColor:colors.g300,borderRadius:20,padding:12,gap:8},divider:{height:1,backgroundColor:colors.g200,marginVertical:4},titleRow:{flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:20,fontWeight:'600'},discount:{fontSize:16,fontWeight:'600',color:colors.info},meta:{flexDirection:'row',alignItems:'center',gap:10},shop:{fontSize:14,fontWeight:'600',color:colors.g800},address:{flex:1,fontSize:12,color:colors.g600},urgent:{fontSize:12,fontWeight:'600',color:colors.white,backgroundColor:colors.info,paddingHorizontal:6,paddingVertical:4,borderRadius:4},insight:{minHeight:58,padding:8,borderRadius:8,backgroundColor:'rgba(255,237,204,.5)',flexDirection:'row',alignItems:'center',gap:8},insightText:{flex:1,fontSize:12,fontWeight:'600',lineHeight:16,color:colors.primary500},priceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},price:{fontSize:20,fontWeight:'600',color:colors.danger},remaining:{fontSize:12,color:colors.g600},actions:{flexDirection:'row',gap:16,marginTop:8},buy:{flex:1,height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},reserve:{flex:1,height:56,borderRadius:radius.md,backgroundColor:colors.g300,alignItems:'center',justifyContent:'center'},actionText:{fontSize:16,fontWeight:'600',color:colors.white}});
