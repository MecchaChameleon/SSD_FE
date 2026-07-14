import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { ActionButton } from '../components/ui';
import { colors } from '../theme';
import Character from '../../icon/로컬타임_캐릭터 1.svg';

export function CompleteScreen({name,userType,onStart}:{name:string;userType:'buyer'|'seller';onStart:()=>void}) { return <View style={s.root}>
  <View style={s.glow}/><View style={s.character}><Character width={124} height={124}/></View>
  <View style={s.copy}><Text style={s.title}>{name}님, 환영합니다!</Text><Text style={s.body}>{userType==='seller'?'매장의 마감 상품 및 자원을 등록하고,\nAI 가격 제안으로 매출을 극대화해 보세요.':'실시간 AI 추천 마감 할인 상품을 조회하고\n구매해 보세요.'}</Text></View>
  <View style={s.button}><ActionButton onPress={onStart}>시작하기</ActionButton></View>
</View>; }
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},glow:{position:'absolute',top:168,alignSelf:'center',width:210,height:210,borderRadius:105,backgroundColor:'#fff9e9',shadowColor:'#82e7a4',shadowOpacity:.22,shadowRadius:44},character:{position:'absolute',top:231,alignSelf:'center',width:124,height:124},copy:{position:'absolute',top:389,left:16,right:16,alignItems:'center'},title:{fontSize:20,lineHeight:24,fontWeight:'600',color:colors.black},body:{marginTop:8,fontSize:14,lineHeight:17,color:colors.g400,textAlign:'center'},button:{position:'absolute',top:559,left:16,right:16}});
