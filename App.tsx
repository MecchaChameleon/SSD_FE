import React,{useCallback,useEffect,useState} from 'react';
import { ActivityIndicator,Platform,SafeAreaView,StyleSheet,Text,View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from './src/screens/SplashScreen'; import { OnboardingScreen } from './src/screens/OnboardingScreen'; import { LoginScreen } from './src/screens/LoginScreen'; import { SignupScreen } from './src/screens/SignupScreen'; import { CompleteScreen } from './src/screens/CompleteScreen'; import { ComponentGalleryScreen } from './src/screens/ComponentGalleryScreen'; import { colors,screen } from './src/theme';
import { LoginUser,useKakaoLogin } from './src/auth/kakao';
import { BuyerHomeScreen } from './src/screens/BuyerHomeScreen';
type Route='loading'|'splash'|'onboarding'|'login'|'signup'|'complete'|'home'|'gallery';
export default function App(){const [route,setRoute]=useState<Route>('loading');const [name,setName]=useState('로컬이');const [type]=useState<'buyer'|'seller'>('buyer');
 useEffect(()=>{AsyncStorage.getItem('localtime:onboarding-complete').then(v=>setRoute(v==='true'?'login':'splash')).catch(()=>setRoute('splash'))},[]);
 const afterSplash=useCallback(()=>setRoute('onboarding'),[]); const finishOnboarding=async()=>{await AsyncStorage.setItem('localtime:onboarding-complete','true');setRoute('login')};
 const handleLogin=useCallback((user:LoginUser)=>{setName(user.nickname??'로컬타임');setRoute(user.isNewUser?'signup':'home')},[]); const kakao=useKakaoLogin(handleLogin);
 const signup=async(n:string)=>{setName(n);await AsyncStorage.setItem('localtime:member','true');setRoute('complete')};
 const content=route==='loading'?<ActivityIndicator color={colors.primary500}/>:route==='splash'?<SplashScreen onDone={afterSplash}/>:route==='onboarding'?<OnboardingScreen onDone={finishOnboarding}/>:route==='login'?<LoginScreen onLogin={kakao.login} loading={kakao.loading} error={kakao.error} disabled={!kakao.ready}/>:route==='signup'?<SignupScreen onBack={()=>setRoute('login')} onComplete={signup}/>:route==='complete'?<CompleteScreen name={name} userType={type} onStart={()=>setRoute('home')}/>:route==='gallery'?<ComponentGalleryScreen onClose={()=>setRoute('home')}/>:<BuyerHomeScreen/>;
 return <SafeAreaView style={s.safe}><StatusBar style="dark"/><View style={s.device}>{content}</View></SafeAreaView>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:Platform.OS==='web'?'#efefed':colors.white,alignItems:'center'},device:{flex:1,width:'100%',maxWidth:screen.maxWidth,backgroundColor:colors.white,overflow:'hidden',...(Platform.OS==='web'?{boxShadow:'0 0 40px rgba(17,17,17,.10)'} as object:{})},home:{flex:1,alignItems:'center',justifyContent:'center',padding:24},homeTitle:{fontSize:24,fontWeight:'700'},homeBody:{marginTop:8,color:colors.g500,textAlign:'center'},gallery:{marginTop:30,color:colors.primary700,fontWeight:'700',padding:12}});
