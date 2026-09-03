import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppHeaderHeight } from '../components/home';
import { ActionButton } from '../components/ui';
import { colors } from '../theme';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import ChevronLeft from '../../icon/chevron_left.svg';

export function SignupScreen({initialNickname,profileImageUrl,onBack,onComplete}:{initialNickname?:string|null;profileImageUrl?:string|null;onBack:()=>void;onComplete:(name:string)=>void}) {
  const { topInset } = useAppHeaderHeight();
  const [name,setName]=useState(()=>initialNickname?.slice(0,10)??'');
  const valid=name.trim().length>=2&&name.trim().length<=10;
  return <View style={[s.root, { paddingTop: topInset }]}>
    <View style={s.header}>
      <Pressable accessibilityLabel="뒤로 가기" onPress={onBack} style={s.back}>
        <ChevronLeft width={24} height={24} color={colors.black}/>
      </Pressable>
      <Text style={s.headerTitle}>회원가입</Text>
    </View>
    <View style={s.content}>
      <View style={s.avatar}>
        {profileImageUrl?<Image source={{uri:profileImageUrl}} style={s.avatarImage}/>:<Character width={92} height={92}/>}
        <View style={s.add}><Text style={s.addText}>＋</Text></View>
      </View>
      <View style={s.form}>
        <Text style={s.label}>닉네임 <Text style={s.required}>*</Text></Text>
        <TextInput value={name} onChangeText={setName} maxLength={10} placeholder="2~10자 이내" placeholderTextColor={colors.g400} style={s.input}/>
      </View>
      <View style={s.button}>
        <ActionButton disabled={!valid} onPress={()=>onComplete(name.trim())}>가입하기</ActionButton>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.g200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  back: { position: 'absolute', left: 16, width: 40, height: 56, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.black },
  content: { paddingHorizontal: 16, paddingTop: 54 },
  avatar: { alignSelf: 'center', width: 120, height: 120, borderRadius: 60, overflow: 'visible', backgroundColor: colors.g200, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  add: { position: 'absolute', right: 0, bottom: 0, width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: colors.g300, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 18, lineHeight: 22, color: colors.g800 },
  form: { gap: 8, marginBottom: 48 },
  label: { fontSize: 14, fontWeight: '500', color: colors.black },
  required: { color: colors.primary500, fontSize: 16 },
  input: { height: 52, borderWidth: 1, borderColor: colors.g300, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: colors.black },
  button: {},
});
