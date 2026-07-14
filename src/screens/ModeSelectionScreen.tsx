import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ui';
import { colors } from '../theme';
import BrandLogo from '../../icon/로컬타임_로고1 1.svg';

export type ServiceMode='buyer'|'seller';

export function ModeSelectionScreen({onComplete}:{onComplete:(mode:ServiceMode)=>void}) {
  const [mode,setMode]=useState<ServiceMode|null>(null);
  return <View style={s.root}>
    <View style={s.logo}><BrandLogo width="100%" height="100%"/></View>
    <View style={s.titleBlock}><Text style={s.title}>서비스를 어떻게 이용할까요?</Text><Text style={s.helper}>ⓘ 모드는 최초 1회 사업자 인증 후 앱 내 설정에서 언제든지 변경 가능합니다.</Text></View>
    <View style={s.cards}>
      <ModeCard title="구매자" description="내 주변 제주의 실시간 마감 할인 상품을 구매" selected={mode==='buyer'} onPress={()=>setMode('buyer')}/>
      <ModeCard title="판매자" description={'매장의 마감 상품 및 자원을 등록하고, AI 추천가 확인'} selected={mode==='seller'} onPress={()=>setMode('seller')}/>
    </View>
    <View style={s.button}><ActionButton disabled={!mode} onPress={()=>mode&&onComplete(mode)}>다음</ActionButton></View>
  </View>;
}

function ModeCard({title,description,selected,onPress}:{title:string;description:string;selected:boolean;onPress:()=>void}) {return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={onPress} style={[s.card,selected&&s.cardSelected]}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardDescription}>{description}</Text></Pressable>}

const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},logo:{position:'absolute',left:6,top:87,width:133,height:61},titleBlock:{position:'absolute',left:19,right:13,top:159,gap:6},title:{fontSize:18,fontWeight:'600',lineHeight:21,color:colors.black},helper:{fontSize:11,lineHeight:14,color:colors.g400},cards:{position:'absolute',left:16,right:16,top:265,gap:12},card:{height:120,borderWidth:1,borderColor:colors.g200,borderRadius:16,paddingHorizontal:16,justifyContent:'center'},cardSelected:{borderColor:colors.primary500},cardTitle:{fontSize:20,lineHeight:24,fontWeight:'600',color:colors.black},cardDescription:{marginTop:8,fontSize:13,lineHeight:18,color:colors.g500},button:{position:'absolute',top:586,left:16,right:16}});
