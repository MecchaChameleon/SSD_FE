import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { buyerApi, Product } from '../api';
import { BottomNavigation } from '../components/home';
import { colors, radius } from '../theme';
import CrosshairIcon from '../../icon/crosshair.svg';

type Props={onHome:()=>void;onPurchases:()=>void;onLikes:()=>void;onMyPage:()=>void;onBuy:(product:Product)=>void;showNavigation?:boolean};
type MapMessage={type:'ready'}|{type:'select';id:string}|{type:'error';message:string};

const jsKey=process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY??'';
const webAppUrl=(process.env.EXPO_PUBLIC_WEB_APP_URL??'').replace(/\/$/,'');
const NativeWebView=WebView as unknown as React.ComponentType<any>;

export function NativeBuyerMapScreen({onHome,onPurchases,onLikes,onMyPage,onBuy,showNavigation=true}:Props){
  const webView=useRef<any>(null);
  const[selected,setSelected]=useState<Product|null>(null);
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(true);
  const mapUrl=useMemo(()=>webAppUrl&&jsKey?`${webAppUrl}/kakao-map.html?appkey=${encodeURIComponent(jsKey)}`:'',[]);

  const sendProducts=useCallback(async()=>{
    try{
      const response=await buyerApi.products({size:100});
      webView.current?.postMessage(JSON.stringify({type:'products',products:response.content.map(product=>({id:product.id,name:product.name,address:product.address}))}));
      setLoading(false);
    }catch(cause){setError(cause instanceof Error?cause.message:'지도 상품을 불러오지 못했습니다.');setLoading(false)}
  },[]);

  const onMessage=useCallback((event:WebViewMessageEvent)=>{
    try{
      const message=JSON.parse(event.nativeEvent.data) as MapMessage;
      if(message.type==='ready')void sendProducts();
      if(message.type==='select')void buyerApi.product(Number(message.id)).then(setSelected).catch(cause=>setError(cause instanceof Error?cause.message:'상품을 불러오지 못했습니다.'));
      if(message.type==='error'){setError(message.message);setLoading(false)}
    }catch{setError('지도와 통신하는 중 오류가 발생했습니다.');setLoading(false)}
  },[sendProducts]);

  const locate=useCallback(async()=>{
    if(Platform.OS==='android'){
      const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if(result!==PermissionsAndroid.RESULTS.GRANTED){setError('현재 위치를 사용하려면 위치 권한을 허용해 주세요.');return}
    }
    setError('');webView.current?.injectJavaScript('window.localtimeMap&&window.localtimeMap.locate();true;');
  },[]);

  const navigation=showNavigation?<BottomNavigation active="map" onSelect={tab=>tab==='home'?onHome():tab==='purchases'?onPurchases():tab==='likes'?onLikes():tab==='mypage'?onMyPage():undefined}/>:null;
  if(!mapUrl)return <View style={s.root}><MapError text="EXPO_PUBLIC_WEB_APP_URL 또는 카카오 JavaScript 키가 설정되지 않았습니다."/>{navigation}</View>;

  return <View style={s.root}>
    <NativeWebView ref={webView} source={{uri:mapUrl}} onMessage={onMessage} javaScriptEnabled domStorageEnabled geolocationEnabled originWhitelist={['https://*']} style={s.map}/>
    {loading?<View style={s.loading}><ActivityIndicator color={colors.primary500}/></View>:null}
    {error?<MapError text={error}/>:null}
    <Pressable accessibilityLabel="현재 위치" style={[s.locationButton,selected&&s.locationButtonRaised]} onPress={()=>void locate()}><CrosshairIcon width={24} height={24} color={colors.g500}/></Pressable>
    {selected?<View style={[s.sheet,{bottom:showNavigation?66:0}]}><Pressable onPress={()=>setSelected(null)} style={s.handleTouch}><View style={s.handle}/></Pressable><Text numberOfLines={1} style={s.title}>{selected.name}</Text><Text style={s.shop}>{selected.businessName}</Text><Text numberOfLines={2} style={s.address}>{selected.address}</Text><View style={s.priceRow}><Text style={s.original}>{selected.price.toLocaleString()}원</Text><Text style={s.price}>{selected.currentPrice.toLocaleString()}원</Text></View><Pressable style={s.buy} onPress={()=>onBuy(selected)}><Text style={s.buyText}>구매하기</Text></Pressable></View>:null}
    {navigation}
  </View>;
}

function MapError({text}:{text:string}){return <View style={s.error}><Text style={s.errorTitle}>카카오 지도를 표시할 수 없습니다.</Text><Text style={s.errorText}>{text}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#eef1f2'},map:{flex:1,backgroundColor:'#eef1f2'},loading:{position:'absolute',top:'45%',alignSelf:'center',padding:14,borderRadius:30,backgroundColor:colors.white},error:{position:'absolute',top:'38%',left:24,right:24,padding:20,borderRadius:radius.md,backgroundColor:colors.white,alignItems:'center',gap:8},errorTitle:{fontSize:16,fontWeight:'600'},errorText:{fontSize:12,color:colors.g500,textAlign:'center'},locationButton:{position:'absolute',right:16,bottom:82,width:48,height:48,borderRadius:24,backgroundColor:colors.white,alignItems:'center',justifyContent:'center',elevation:5},locationButtonRaised:{bottom:350},sheet:{position:'absolute',left:0,right:0,padding:16,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:colors.white,gap:8},handleTouch:{height:12,alignItems:'center'},handle:{width:60,height:4,borderRadius:2,backgroundColor:colors.g200},title:{fontSize:20,fontWeight:'600'},shop:{fontSize:14,fontWeight:'600',color:colors.g800},address:{fontSize:12,color:colors.g600},priceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},price:{fontSize:20,fontWeight:'600',color:colors.danger},buy:{height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},buyText:{fontSize:16,fontWeight:'600',color:colors.white}});
