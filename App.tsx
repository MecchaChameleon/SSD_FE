import React,{useCallback,useEffect,useState} from 'react';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from './src/screens/SplashScreen'; import { OnboardingScreen } from './src/screens/OnboardingScreen'; import { LoginScreen } from './src/screens/LoginScreen'; import { SignupScreen } from './src/screens/SignupScreen'; import { CompleteScreen } from './src/screens/CompleteScreen'; import { ComponentGalleryScreen } from './src/screens/ComponentGalleryScreen'; import { BuyerHomeScreen } from './src/screens/BuyerHomeScreen';
import type { PurchasePayload } from './src/screens/BuyerHomeScreen';
import { colors } from './src/theme'; import { LoginUser,useKakaoLogin,withdrawAccount } from './src/auth/kakao'; import { DeviceFrame } from './src/components/DeviceFrame';

type Route='loading'|'splash'|'onboarding'|'login'|'signup'|'complete'|'home'|'gallery';
export default function App(){const[route,setRoute]=useState<Route>('loading');const[name,setName]=useState('로컬이');const[type]=useState<'buyer'|'seller'>('buyer');
  useEffect(()=>{AsyncStorage.getItem('localtime:onboarding-complete').then(v=>setRoute(v==='true'?'login':'splash')).catch(()=>setRoute('splash'))},[]);
  const afterSplash=useCallback(()=>setRoute('onboarding'),[]);
  const finishOnboarding=async()=>{await AsyncStorage.setItem('localtime:onboarding-complete','true');setRoute('login')};
  const handleLogin=useCallback((user:LoginUser)=>{setName(user.nickname??'로컬타임');setRoute(user.isNewUser?'signup':'home')},[]);
  const kakao=useKakaoLogin(handleLogin);
  const signup=async(n:string)=>{setName(n);await AsyncStorage.setItem('localtime:member','true');setRoute('complete')};
  const logout=async()=>{await AsyncStorage.multiRemove(['localtime:access-token','localtime:user','localtime:member','localtime:onboarding-complete']);setName('로컬이');setRoute('splash')};
  const withdraw=async()=>{await withdrawAccount();await AsyncStorage.multiRemove(['localtime:access-token','localtime:user','localtime:member','localtime:onboarding-complete']);setName('로컬이');setRoute('splash')};
  const purchase=async(payload:PurchasePayload)=>{await AsyncStorage.setItem('localtime:last-purchase',JSON.stringify({...payload,requestedAt:new Date().toISOString()}))};
  const content=route==='loading'?<ActivityIndicator color={colors.primary500}/>:route==='splash'?<SplashScreen onDone={afterSplash}/>:route==='onboarding'?<OnboardingScreen onDone={finishOnboarding}/>:route==='login'?<LoginScreen onLogin={kakao.login} loading={kakao.loading} error={kakao.error} disabled={!kakao.ready}/>:route==='signup'?<SignupScreen onBack={()=>setRoute('login')} onComplete={signup}/>:route==='complete'?<CompleteScreen name={name} userType={type} onStart={()=>setRoute('home')}/>:route==='gallery'?<ComponentGalleryScreen onClose={()=>setRoute('home')}/>:<BuyerHomeScreen onLogout={logout} onWithdraw={withdraw} onPurchase={purchase}/>;
  return <><StatusBar style="dark"/><DeviceFrame>{content}</DeviceFrame></>;
}
