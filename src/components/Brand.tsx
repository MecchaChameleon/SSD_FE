import React from 'react';
import { StyleSheet, View } from 'react-native';
import BrandLogo from '../../icon/로컬타임_로고1 1.svg';

export function Brand({compact=false}:{compact?:boolean}) {
  return <View style={[s.wrap,compact&&s.compact]}><BrandLogo width="100%" height="100%"/></View>;
}
const s=StyleSheet.create({wrap:{width:270,height:126},compact:{width:150,height:70}});
