import React, { useEffect } from 'react'; import { StyleSheet, View } from 'react-native'; import { Brand } from '../components/Brand';
export function SplashScreen({onDone}:{onDone:()=>void}) { useEffect(()=>{const id=setTimeout(onDone,1400);return()=>clearTimeout(id)},[onDone]); return <View style={s.root}><Brand/></View>; }
const s=StyleSheet.create({root:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'}});
