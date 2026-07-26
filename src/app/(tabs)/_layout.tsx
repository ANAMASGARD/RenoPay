import { GlassTabBar } from '@/components/navigation/glass-tab-bar';
import { SwipeTabs } from '@/components/navigation/swipe-tabs';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { PaySwipeLockProvider, usePaySwipeLock } from '@/hooks/use-pay-swipe-lock';
import { usePersona } from '@/features/persona/persona-context';

function TabsLayoutInner() {
  const { locked } = usePaySwipeLock();
  const { persona } = usePersona();
  const isClub = persona === 'club';

  return (
    <SwipeTabs
      key={persona ?? 'none'}
      initialRouteName={isClub ? 'gate' : 'pay'}
      tabBar={(props) => <GlassTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
        lazyPreloadDistance: 0,
        sceneStyle: { backgroundColor: RenoPayBrand.background },
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { height: 0, opacity: 0 },
        tabBarStyle: { height: 0 },
      }}>
      <SwipeTabs.Protected guard={!isClub}>
        <SwipeTabs.Screen name="pay" options={{ title: 'PAY', swipeEnabled: !locked }} />
        <SwipeTabs.Screen name="tickets" options={{ title: 'TICKETS' }} />
        <SwipeTabs.Screen name="map" options={{ title: 'MAP', swipeEnabled: false }} />
      </SwipeTabs.Protected>

      <SwipeTabs.Protected guard={isClub}>
        <SwipeTabs.Screen name="gate" options={{ title: 'CREATE' }} />
        <SwipeTabs.Screen name="issued" options={{ title: 'ISSUED' }} />
        <SwipeTabs.Screen name="attendees" options={{ title: 'VERIFY' }} />
      </SwipeTabs.Protected>

      <SwipeTabs.Screen name="settings" options={{ title: 'SETTINGS' }} />
    </SwipeTabs>
  );
}

export default function TabsLayout() {
  return (
    <PaySwipeLockProvider>
      <TabsLayoutInner />
    </PaySwipeLockProvider>
  );
}
