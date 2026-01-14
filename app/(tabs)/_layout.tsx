import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getFirebaseAuth } from '@/lib/firebase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isSidebar = Platform.OS === 'web' && width >= 900;
  const sidebarWidth = 220;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return (
    <Tabs
      key={user ? 'authed' : 'anon'}
      sceneContainerStyle={isSidebar ? { marginLeft: sidebarWidth } : undefined}
      initialRouteName={user ? 'stories' : 'auth'}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
      tabBar={(props) =>
        isSidebar ? (
          <SidebarTabBar {...props} width={sidebarWidth} colorScheme={colorScheme} />
        ) : (
          <BottomTabBar {...props} />
        )
      }>
      {!user && (
        <Tabs.Screen
          name="auth"
          options={{
            title: 'Auth',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: 'My Stories',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

function SidebarTabBar({
  width,
  colorScheme,
  ...props
}: BottomTabBarProps & { width: number; colorScheme?: string | null }) {
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor = '#6b7280';

  return (
    <View style={[styles.sidebar, { width }]}>
      {props.state.routes.map((route, index) => {
        const { options } = props.descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = props.state.index === index;
        const onPress = () => {
          const event = props.navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            props.navigation.navigate(route.name);
          }
        };
        const icon =
          options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? activeColor : inactiveColor,
            size: 24,
          }) ?? null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.sidebarItem, isFocused && styles.sidebarItemActive]}>
            <View style={styles.iconRow}>
              {icon}
              <Text style={[styles.sidebarLabel, isFocused && styles.sidebarLabelActive]}>{label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarItemActive: {
    backgroundColor: '#f0f9ff',
  },
  sidebarLabel: {
    fontWeight: '600',
    color: '#4b5563',
  },
  sidebarLabelActive: {
    color: '#0f172a',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
