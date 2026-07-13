import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors, screen } from '../theme';

/**
 * Figma `*16 pro 기본 프레임*` (402 x 874).
 * Native already owns its status bar/safe area, so the chrome is web-only.
 */
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <View style={s.native}>{children}</View>;

  return <View style={s.webStage}><View style={s.phone}>{children}</View></View>;
}

const s = StyleSheet.create({
  native:{flex:1,backgroundColor:colors.white},
  webStage:{flex:1,width:'100%',backgroundColor:'#efefed',alignItems:'center',justifyContent:'center'},
  phone:{flex:1,width:'100%',maxWidth:screen.designWidth,maxHeight:874,backgroundColor:colors.white,overflow:'hidden'},
});
