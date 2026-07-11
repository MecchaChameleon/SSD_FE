import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

type Product = {
  id: number; title: string; discount: string; shop: string; location: string;
  detail: string; insight: string; original: string; price: string; remaining: string;
  urgent?: boolean;
};

const products: Product[] = [
  { id:1,title:'제주 흑돼지 모둠 도시락 세트',discount:'62.5%',shop:'춘자네 흑돼지 협재점',location:'제주시 한림읍 · 850m',detail:'당일 재고 · 마감 22:00',urgent:true,insight:'저녁 기온이 선선해 야외 야식 수요 급증하고 있어요. 최소 판매가 직전까지 떨어뜨린 역대급 세일 기회를 놓치지 마세요!',original:'20,000원',price:'7,500원',remaining:'잔여수량 2개'},
  { id:2,title:'바다 전망 커플룸 당일 숙박권',discount:'20%',shop:'푸른바다 게스트하우스',location:'제주시 애월읍 · 2.4km',detail:'당일 공실 · 마감 23:00',insight:'애월 해안도로 주변에 야간 소나기 예보가 있습니다. 아늑한 바다뷰 객실을 싼값에 잡을 수 있는 찬스입니다!',original:'90,000원',price:'72,000원',remaining:'잔여수량 1개'},
];

const categories=['전체','음식점','숙박','체험','렌탈 / 모빌리티','당일 재고','당일 공실','빈 시간대 자원'];

export function BuyerHomeScreen(){
  const [category,setCategory]=useState('전체');
  const [liked,setLiked]=useState<number[]>([]);
  const [purchase,setPurchase]=useState<Product|null>(null);
  const toggleLike=(id:number)=>setLiked(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  return <View style={s.root}>
    <View style={s.header}><Text style={s.logo}>로컬타임</Text><Text style={s.bell}>♧</Text></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.heading}>로컬타임이 찾은 오늘 마감 특가 상품</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {categories.map(x=><Pressable key={x} onPress={()=>setCategory(x)} style={[s.chip,category===x&&s.chipOn]}><Text style={[s.chipText,category===x&&s.chipTextOn]}>{x}</Text></Pressable>)}
      </ScrollView>
      <View style={s.sort}><Text style={s.sortText}>AI 추천순⌄</Text></View>
      {products.map(p=><ProductCard key={p.id} product={p} liked={liked.includes(p.id)} onLike={()=>toggleLike(p.id)} onBuy={()=>setPurchase(p)}/>)}
    </ScrollView>
    <BottomNavigation/>
    <Modal transparent visible={!!purchase} animationType="fade" onRequestClose={()=>setPurchase(null)}>
      <View style={s.overlay}><View style={s.dialog}><Text style={s.dialogTitle}>상품을 구매하시겠습니까?</Text><View style={s.dialogButtons}><Pressable onPress={()=>setPurchase(null)} style={[s.dialogButton,s.cancel]}><Text style={s.buttonText}>취소</Text></Pressable><Pressable onPress={()=>setPurchase(null)} style={[s.dialogButton,s.buy]}><Text style={s.buttonText}>구매하기</Text></Pressable></View></View></View>
    </Modal>
  </View>;
}

function ProductCard({product,liked,onLike,onBuy}:{product:Product;liked:boolean;onLike:()=>void;onBuy:()=>void}){
  return <View style={s.card}>
    <Pressable accessibilityRole="button" accessibilityLabel="찜하기" onPress={onLike} style={s.heartRow}><Text style={[s.heart,liked&&s.heartOn]}>{liked?'♥':'♡'}</Text></Pressable>
    <View style={s.body}>
      <View style={s.titleRow}><Text numberOfLines={1} style={s.title}>{product.title}</Text><Text style={s.discount}>{product.discount}</Text></View>
      <View style={s.metaRow}><Text style={s.shop}>{product.shop}</Text><Text style={s.location}>{product.location}</Text></View>
      <View style={s.metaRow}><Text style={s.detail}>{product.detail}</Text>{product.urgent?<View style={s.tag}><Text style={s.tagText}>마감임박</Text></View>:null}</View>
      <View style={s.insight}><Text style={s.sun}>☼</Text><Text style={s.insightText}>{product.insight}</Text></View>
      <View style={s.priceRow}><Text style={s.original}>{product.original}</Text><Text style={s.price}>{product.price}</Text></View>
      <Text style={s.remaining}>{product.remaining}</Text>
    </View>
    <View style={s.actions}><Pressable onPress={onBuy} style={[s.action,s.primary]}><Text style={s.buttonText}>즉시 구매</Text></Pressable><Pressable style={[s.action,s.secondary]}><Text style={s.buttonText}>예약하기</Text></Pressable></View>
  </View>;
}

function BottomNavigation(){const items=[['⌂','홈'],['⌖','지도'],['☑','예약내역'],['♙','마이페이지']];return <View style={s.nav}>{items.map(([icon,label],i)=><View key={label} style={s.navItem}><Text style={[s.navIcon,i===0&&s.active]}>{icon}</Text><Text style={[s.navLabel,i===0&&s.active]}>{label}</Text></View>)}</View>}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white},header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},logo:{color:colors.primary500,fontSize:24,fontWeight:'900',letterSpacing:-1.5},bell:{fontSize:27,color:colors.black,transform:[{rotate:'180deg'}]},content:{paddingHorizontal:14,paddingTop:12,paddingBottom:104},heading:{fontSize:20,fontWeight:'600',color:colors.black,marginBottom:16},chips:{gap:8,paddingRight:14},chip:{height:40,paddingHorizontal:12,borderWidth:1,borderColor:colors.g300,borderRadius:20,alignItems:'center',justifyContent:'center'},chipOn:{backgroundColor:colors.primary500,borderColor:colors.primary500},chipText:{color:colors.g300,fontSize:16},chipTextOn:{color:colors.white,fontWeight:'600'},sort:{height:44,alignItems:'flex-end',justifyContent:'center'},sortText:{fontSize:12,color:colors.g500},card:{borderWidth:1,borderColor:colors.g300,borderRadius:20,paddingHorizontal:12,paddingVertical:16,marginBottom:8,gap:16},heartRow:{height:38,borderBottomWidth:1,borderBottomColor:colors.g200,justifyContent:'flex-start'},heart:{fontSize:31,lineHeight:31,color:colors.g300},heartOn:{color:colors.primary500},body:{paddingBottom:16,borderBottomWidth:1,borderBottomColor:colors.g200,gap:6},titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},title:{flex:1,fontSize:20,fontWeight:'600',color:colors.black},discount:{fontSize:16,fontWeight:'600',color:'#307fe7'},metaRow:{flexDirection:'row',alignItems:'center',gap:10},shop:{fontSize:14,fontWeight:'600',color:colors.g800},location:{fontSize:12,color:'#7e7c77'},detail:{fontSize:12,color:'#7e7c77'},tag:{paddingHorizontal:6,paddingVertical:4,borderRadius:4,backgroundColor:'#307fe7'},tagText:{fontSize:12,fontWeight:'600',color:colors.white},insight:{marginTop:4,minHeight:64,paddingHorizontal:8,paddingVertical:12,borderRadius:8,backgroundColor:'#fff5e3',flexDirection:'row',alignItems:'center',gap:8},sun:{fontSize:28,color:colors.primary500},insightText:{flex:1,fontSize:12,fontWeight:'600',lineHeight:17,color:colors.primary500},priceRow:{marginTop:3,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},original:{fontSize:16,color:colors.g800,textDecorationLine:'line-through'},price:{fontSize:20,fontWeight:'600',color:'#eb4031'},remaining:{fontSize:12,color:'#7e7c77'},actions:{flexDirection:'row',gap:16},action:{flex:1,height:56,borderRadius:12,alignItems:'center',justifyContent:'center'},primary:{backgroundColor:colors.primary500},secondary:{backgroundColor:colors.g300},buttonText:{color:colors.white,fontSize:16,fontWeight:'600'},nav:{position:'absolute',left:0,right:0,bottom:0,height:76,paddingHorizontal:16,backgroundColor:colors.white,flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#f4f4f3'},navItem:{width:78,paddingVertical:7,alignItems:'center',gap:4},navIcon:{fontSize:25,color:colors.g400},navLabel:{fontSize:12,fontWeight:'600',color:colors.g400},active:{color:colors.primary500},overlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',alignItems:'center',justifyContent:'center',paddingHorizontal:16},dialog:{width:'100%',maxWidth:370,borderRadius:20,backgroundColor:colors.white,paddingHorizontal:20,paddingTop:40,paddingBottom:16,gap:32},dialogTitle:{textAlign:'center',fontSize:16,fontWeight:'500',color:colors.black},dialogButtons:{flexDirection:'row',gap:8},dialogButton:{flex:1,height:56,borderRadius:12,alignItems:'center',justifyContent:'center'},cancel:{backgroundColor:colors.g300},buy:{backgroundColor:colors.primary500}
});
