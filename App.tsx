import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ModeSelectionScreen, ServiceMode } from './src/screens/ModeSelectionScreen';
import { CompleteScreen } from './src/screens/CompleteScreen';
import { ComponentGalleryScreen } from './src/screens/ComponentGalleryScreen';
import { BuyerHomeScreen } from './src/screens/BuyerHomeScreen';
import { BusinessRegistrationScreen } from './src/screens/MyPageScreen';
import type { PurchasePayload } from './src/screens/BuyerHomeScreen';
import { colors } from './src/theme';
import { LoginUser,useKakaoLogin,withdrawAccount } from './src/auth/kakao';
import { DeviceFrame } from './src/components/DeviceFrame';
import { authApi, sellerApi } from './src/api';
import { warmUpApi } from './src/api/client';
import { CachedUser, SELLER_DASHBOARD_CACHE_KEY, USER_CACHE_KEY, readCache, readWebCache, removeCaches, writeCache } from './src/cache/appCache';

type Route='loading'|'splash'|'onboarding'|'login'|'signup'|'mode'|'businessRegistration'|'complete'|'home'|'gallery';
type HomeEntry='buyer'|'seller'|'businessRegistration';

void warmUpApi();

export default function App(){
  const [route,setRoute]=useState<Route>('loading');
  const initialUser=readWebCache<CachedUser>(USER_CACHE_KEY);
  const [name,setName]=useState(initialUser?.nickname??'로컬이');
  const [profileImageUrl,setProfileImageUrl]=useState<string|null>(initialUser?.profileImageUrl??null);
  const [type,setType]=useState<ServiceMode>('buyer');
  const [homeEntry,setHomeEntry]=useState<HomeEntry>('buyer');

  useEffect(()=>{Promise.all([AsyncStorage.getItem('localtime:onboarding-complete'),readCache<CachedUser>(USER_CACHE_KEY)]).then(([v,user])=>{if(user?.nickname)setName(user.nickname);if(user?.profileImageUrl)setProfileImageUrl(user.profileImageUrl);setRoute(v==='true'?'login':'splash')}).catch(()=>setRoute('splash'))},[]);
  const afterSplash=useCallback(()=>setRoute('onboarding'),[]);
  const finishOnboarding=async()=>{await AsyncStorage.setItem('localtime:onboarding-complete','true');setRoute('login')};

  const handleLogin=useCallback(async(user:LoginUser)=>{
    setName(user.nickname??'로컬이');
    if(user.isNewUser){
      try{const me=await authApi.me();setProfileImageUrl(me.profileImageUrl)}catch{}
      setRoute('signup');
      return;
    }
    try{
      const me=await authApi.me();
      setName(me.nickname);
      setProfileImageUrl(me.profileImageUrl);
      await writeCache(USER_CACHE_KEY,{...user,nickname:me.nickname,profileImageUrl:me.profileImageUrl});
    }catch{}
    setRoute('mode');
  },[]);
  const kakao=useKakaoLogin(handleLogin);

  const signup=async(nextName:string)=>{
    await authApi.updateMe({nickname:nextName});
    setName(nextName);
    const cached=await readCache<CachedUser>(USER_CACHE_KEY);
    await writeCache(USER_CACHE_KEY,{...cached,nickname:nextName,profileImageUrl});
    await AsyncStorage.setItem('localtime:member','true');
    setRoute('mode');
  };
  const selectMode=async(mode:ServiceMode)=>{
    setType(mode);
    if(mode==='buyer'){
      setHomeEntry('buyer');
      setRoute('complete');
      return;
    }
    try{
      await sellerApi.profile();
      setHomeEntry('seller');
      setRoute('complete');
    }catch{
      setRoute('businessRegistration');
    }
  };
  const finishBusinessRegistration=()=>{setType('seller');setHomeEntry('seller');setRoute('complete')};
  const start=()=>setRoute('home');
  const logout=async()=>{try{await authApi.logout()}catch{}await removeCaches(['localtime:access-token',USER_CACHE_KEY,'localtime:member','localtime:onboarding-complete',SELLER_DASHBOARD_CACHE_KEY]);setName('로컬이');setProfileImageUrl(null);setHomeEntry('buyer');setRoute('splash')};
  const withdraw=async()=>{await withdrawAccount();await removeCaches(['localtime:access-token',USER_CACHE_KEY,'localtime:member','localtime:onboarding-complete',SELLER_DASHBOARD_CACHE_KEY]);setName('로컬이');setProfileImageUrl(null);setHomeEntry('buyer');setRoute('splash')};
  const purchase=async(payload:PurchasePayload)=>{await AsyncStorage.setItem('localtime:last-purchase',JSON.stringify({...payload,requestedAt:new Date().toISOString()}))};

  const content=route==='loading'?<ActivityIndicator color={colors.primary500}/>
    :route==='splash'?<SplashScreen onDone={afterSplash}/>
    :route==='onboarding'?<OnboardingScreen onDone={finishOnboarding}/>
    :route==='login'?<LoginScreen onLogin={kakao.login} loading={kakao.loading} error={kakao.error} disabled={!kakao.ready}/>
    :route==='signup'?<SignupScreen initialNickname={name} profileImageUrl={profileImageUrl} onBack={()=>setRoute('login')} onComplete={signup}/>
    :route==='mode'?<ModeSelectionScreen onComplete={selectMode}/>
    :route==='businessRegistration'?<BusinessRegistrationScreen name={name} onBack={()=>setRoute('mode')} onComplete={finishBusinessRegistration}/>
    :route==='complete'?<CompleteScreen name={name} userType={type} onStart={start}/>
    :route==='gallery'?<ComponentGalleryScreen onClose={()=>setRoute('home')}/>
    :<BuyerHomeScreen initialEntry={homeEntry} onBusinessRegistered={finishBusinessRegistration} onLogout={logout} onWithdraw={withdraw} onPurchase={purchase}/>;
  return <><StatusBar style="dark"/><DeviceFrame>{content}</DeviceFrame></>;
}
