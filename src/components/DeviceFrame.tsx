import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, screen } from '../theme';

/**
 * Figma `*16 pro 기본 프레임*` (402 x 874).
 * Native already owns its status bar/safe area, so the chrome is web-only.
 */
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <View style={s.native}>{children}</View>;

  return <View style={s.webStage}>
    <View style={s.phone}>
      <View style={s.statusBar}>
        <View style={s.statusSide}><Text style={s.time}>9:41</Text></View>
        <View style={s.islandSpace} />
        <View style={[s.statusSide, s.levels]}>
          <Text style={s.levelText}>▮▮▮</Text><Text style={s.levelText}>⌁</Text><View style={s.battery}><View style={s.batteryLevel} /></View>
        </View>
      </View>
      <View style={s.content}>{children}</View>
      <View style={s.homeArea}><View style={s.homeIndicator} /></View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  native:{flex:1,backgroundColor:colors.white},
  webStage:{flex:1,width:'100%',backgroundColor:'#efefed',alignItems:'center',justifyContent:'center'},
  phone:{flex:1,width:'100%',maxWidth:screen.designWidth,maxHeight:874,backgroundColor:colors.white,overflow:'hidden',boxShadow:'0 0 40px rgba(17,17,17,.14)' as never},
  statusBar:{height:54,paddingTop:21,flexDirection:'row',alignItems:'flex-start',backgroundColor:colors.white},
  statusSide:{flex:1,height:22,alignItems:'center',justifyContent:'center'},
  time:{fontSize:17,lineHeight:22,fontWeight:'600',color:'#4d3d3d'},
  islandSpace:{width:124,height:10},
  levels:{flexDirection:'row',gap:7}, levelText:{fontSize:11,fontWeight:'700',color:colors.black},
  battery:{width:25,height:12,borderWidth:1,borderColor:colors.black,borderRadius:3,padding:1}, batteryLevel:{flex:1,width:18,borderRadius:1,backgroundColor:colors.black},
  content:{flex:1,overflow:'hidden',backgroundColor:colors.white},
  homeArea:{height:34,backgroundColor:colors.white,alignItems:'center',justifyContent:'flex-end',paddingBottom:8},
  homeIndicator:{width:134,height:5,borderRadius:100,backgroundColor:colors.black},
});
