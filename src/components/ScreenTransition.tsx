import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';

export function ScreenTransition({
  direction,
  children,
}: {
  direction: -1 | 1;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * Math.min(width, 402), 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.72, 1, 1],
  });

  return (
    <Animated.View style={[styles.root, { opacity, transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
});
