import React,{useState} from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { ActionButton } from '../components/ui';
import { colors } from '../theme';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import LocalTimeIcon from '../../icon/로컬타임_아이콘 1.svg';
import CommunityArt from '../../icon/Group 2.svg';

const pages=[
  {title:'여행 중 만나는 실시간 마감 혜택',body:'내 위치와 취향을 기반으로 합리적인 상품을 추천해요.',Art:LocalTimeIcon},
  {title:'AI와 함께 똑똑한 소비',body:'남은 재고와 마감 시간을 분석해 최적의 할인 상품을 추천해요.',Art:Character},
  {title:'지역과 소비를 연결하는 서비스',body:'낭비는 줄이고 합리적인 소비는 늘려요.',Art:CommunityArt},
];

export function OnboardingScreen({onDone}:{onDone:()=>void}) {
  const [page,setPage]=useState(0);
  const next=()=>page===pages.length-1?onDone():setPage(page+1);
  const {title,body,Art}=pages[page];
  return <View style={s.root}>
    <View style={s.hero}><Art width="100%" height="100%"/></View>
    <View style={s.copy}><Text style={s.title}>{title}</Text><Text style={s.body}>{body}</Text></View>
    <View style={s.dots}>{pages.map((_,i)=><View key={i} style={[s.dot,i===page&&s.dotOn]}/>)}</View>
    <View style={s.button}><ActionButton onPress={next}>{page===pages.length-1?'시작하기':'다음'}</ActionButton></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.white},hero:{position:'absolute',top:'13%',left:52,right:52,height:300,alignItems:'center',justifyContent:'center'},copy:{position:'absolute',top:'58.6%',left:16,right:16,alignItems:'center'},title:{fontSize:24,fontWeight:'600',color:colors.black,textAlign:'center'},body:{marginTop:8,fontSize:16,lineHeight:23,color:colors.g500,textAlign:'center'},dots:{position:'absolute',top:'77%',alignSelf:'center',flexDirection:'row',gap:6},dot:{width:6,height:6,borderRadius:3,backgroundColor:colors.g300},dotOn:{width:24,backgroundColor:colors.primary500},button:{position:'absolute',top:'89.7%',left:16,right:16}});
