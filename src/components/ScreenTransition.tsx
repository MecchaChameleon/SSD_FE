import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';

export function ScreenTransition({
  direction,
  screenKey,
  children,
}: {
  direction: -1 | 1;
  screenKey?: React.Key;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const lastKey = useRef<React.Key | undefined>(screenKey);
  const lastChildren = useRef<React.ReactNode>(null);
  const currentChildren = useRef(children);

  const outgoing = useMemo(() => {
    const previous = lastKey.current === screenKey ? null : currentChildren.current;
    lastKey.current = screenKey;
    progress.setValue(0);
    return previous;
  }, [progress, screenKey]);
  lastChildren.current = outgoing;
  currentChildren.current = children;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, screenKey]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * Math.min(width, 402), 0],
  });
  const outgoingTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -direction * Math.min(width, 402)],
  });
  return (
    <Animated.View style={styles.root}>
      {lastChildren.current ? (
        <Animated.View pointerEvents="none" style={[styles.layer, { transform: [{ translateX: outgoingTranslateX }] }]}>
          {lastChildren.current}
        </Animated.View>
      ) : null}
      <Animated.View
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={[styles.layer, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#fff' },
  layer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
});
