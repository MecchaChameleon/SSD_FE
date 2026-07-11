import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
export function Brand({compact=false}:{compact?:boolean}) { return <View style={s.wrap}><View style={[s.pin,compact&&s.pinSmall]}><Text style={[s.clock,compact&&s.clockSmall]}>◷</Text></View><Text style={[s.name,compact&&s.nameSmall]}>로컬타임</Text></View>; }
const s=StyleSheet.create({wrap:{alignItems:'center'},pin:{width:88,height:88,borderRadius:26,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center',transform:[{rotate:'45deg'}]},pinSmall:{width:64,height:64,borderRadius:20},clock:{color:colors.white,fontSize:54,fontWeight:'700',transform:[{rotate:'-45deg'}]},clockSmall:{fontSize:40},name:{marginTop:18,color:colors.primary500,fontSize:35,fontWeight:'800',letterSpacing:-2},nameSmall:{fontSize:27,marginTop:14}});
