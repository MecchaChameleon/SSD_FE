import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { colors, radius } from '../theme';

export function PaymentCompleteScreen({onReservations,onHome}:{onReservations:()=>void;onHome:()=>void}) {
  return <View style={s.root}>
    <View style={s.body}>
      <Character width={112} height={112}/>
      <View style={s.copy}><Text style={s.title}>결제 완료!</Text><Text style={s.description}>매장에 방문하여 사장님께 결제 완료 화면을 보여주세요.</Text></View>
    </View>
    <View style={s.actions}>
      <Pressable style={[s.button,s.primary]} onPress={onReservations}><Text style={s.buttonText}>예약 내역 보러가기</Text></Pressable>
      <Pressable style={[s.button,s.secondary]} onPress={onHome}><Text style={s.buttonText}>홈 화면으로 이동</Text></Pressable>
    </View>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white,paddingHorizontal:16},
  body:{position:'absolute',top:199,left:16,right:16,alignItems:'center'},
  copy:{marginTop:18,gap:6,alignItems:'center'},
  title:{fontSize:18,fontWeight:'600',color:colors.black},
  description:{fontSize:14,color:colors.g800,textAlign:'center'},
  actions:{position:'absolute',left:16,right:16,bottom:68,gap:8},
  button:{height:56,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},
  primary:{backgroundColor:colors.primary500},secondary:{backgroundColor:colors.g300},
  buttonText:{fontSize:16,fontWeight:'600',color:colors.white},
});
