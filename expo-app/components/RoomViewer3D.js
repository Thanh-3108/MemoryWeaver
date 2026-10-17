import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, AppState, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { viewerHtml } from '../generated/viewerHtml';

const source = { html: viewerHtml, baseUrl: 'https://memoryweaver.local' };
export default function RoomViewer3D({
  room,
  textures,
  navMode = 'overview',
  onSelectFurniture,
  onRestrictedTouch,
  onDoorTransition,
  onPovChange,
  onNavModeChange,
  onNavWarning,
  cameraView,
  rotateAction,
  focusLabel,
  glideLabel,
  strollAction,
  speakText,
  lockCamera = true,
  resetOverviewToken = 0,
  activeBookPage,
  flipPictureToken = 0,
  toggleDrawerToken = 0,
  toggleWardrobeToken = 0,
  toggleLampToken = 0,
  toggleFridgeToken = 0,
  toggleCabinetToken = 0,
  toggleTvToken = 0,
  toggleFanToken = 0,
  toggleAcToken = 0,
  sitSofaToken = 0,
  sitChairToken = 0,
  pourDrinkToken = 0,
  waterPlantToken = 0,
  chimeClockToken = 0,
  toggleCurtainsToken = 0,
  hotspotId,
  onHotspotSelected,
  isAudioMuted = false
}) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const update = state => webViewRef.current?.injectJavaScript('window.setAppActive?.(' + (state === 'active') + '); true;');
    update(AppState.currentState || 'active');
    const subscription = AppState.addEventListener('change', update);
    return () => subscription.remove();
  }, [ready]);
  useEffect(() => {
    if (ready) webViewRef.current?.injectJavaScript('window.updateRoom(' + JSON.stringify(room) + '); true;');
  }, [room, ready]);
  useEffect(() => {
    if (ready) {
      webViewRef.current?.injectJavaScript('window.applyExtractedTextures?.(' + JSON.stringify(textures || {}) + '); true;');
    }
  }, [textures, room, ready]);
  useEffect(() => {
    if (ready) {
      webViewRef.current?.injectJavaScript('window.setRoomAudioMuted?.(' + Boolean(isAudioMuted) + '); true;');
    }
  }, [isAudioMuted, ready]);
  useEffect(() => {
    if (ready && rotateAction && rotateAction.token) {
      webViewRef.current?.injectJavaScript('window.rotateView?.("' + rotateAction.direction + '"); true;');
    }
  }, [rotateAction, ready]);
  useEffect(() => {
    if (ready && cameraView) {
      webViewRef.current?.injectJavaScript('window.setCameraView?.("' + cameraView + '"); true;');
    }
  }, [cameraView, ready]);
  useEffect(() => {
    if (ready && navMode) {
      webViewRef.current?.injectJavaScript('window.setNavMode?.("' + navMode + '"); true;');
    }
  }, [navMode, ready]);
  useEffect(() => {
    if (ready && focusLabel) {
      webViewRef.current?.injectJavaScript('window.focusFurnitureByLabel?.(' + JSON.stringify(focusLabel) + '); true;');
    }
  }, [focusLabel, ready]);
  useEffect(() => {
    if (ready && glideLabel) {
      webViewRef.current?.injectJavaScript('window.glideToFurniture?.(' + JSON.stringify(glideLabel) + '); true;');
    }
  }, [glideLabel, ready]);
  useEffect(() => {
    if (ready && strollAction) {
      webViewRef.current?.injectJavaScript('window.strollStep?.(' + JSON.stringify(strollAction) + '); true;');
    }
  }, [strollAction, ready]);
  useEffect(() => {
    if (ready) {
      if (speakText) {
        webViewRef.current?.injectJavaScript('window.speakMemoryText?.(' + JSON.stringify(speakText) + '); true;');
      } else {
        webViewRef.current?.injectJavaScript('window.stopMemoryText?.(); true;');
      }
    }
  }, [speakText, ready]);
  useEffect(() => {
    if (ready) {
      webViewRef.current?.injectJavaScript('window.setCameraLock?.(' + (lockCamera ? 'true' : 'false') + '); true;');
    }
  }, [lockCamera, ready]);
  useEffect(() => {
    if (ready && resetOverviewToken) {
      webViewRef.current?.injectJavaScript('window.resetCameraOverview?.(); true;');
    }
  }, [resetOverviewToken, ready]);
  useEffect(() => {
    if (ready && typeof activeBookPage === 'number') {
      webViewRef.current?.injectJavaScript('window.set3DBookPage?.(' + activeBookPage + '); true;');
    }
  }, [activeBookPage, ready]);
  useEffect(() => {
    if (ready && flipPictureToken) {
      webViewRef.current?.injectJavaScript('window.flipActivePicture?.(); true;');
    }
  }, [flipPictureToken, ready]);
  useEffect(() => {
    if (ready && toggleDrawerToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveDeskDrawer?.(); true;');
    }
  }, [toggleDrawerToken, ready]);
  useEffect(() => {
    if (ready && toggleWardrobeToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveWardrobeDoors?.(); true;');
    }
  }, [toggleWardrobeToken, ready]);
  useEffect(() => {
    if (ready && toggleLampToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveLamp?.(); true;');
    }
  }, [toggleLampToken, ready]);
  useEffect(() => {
    if (ready && toggleFridgeToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveFridge?.(); true;');
    }
  }, [toggleFridgeToken, ready]);
  useEffect(() => {
    if (ready && toggleCabinetToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveCabinet?.(); true;');
    }
  }, [toggleCabinetToken, ready]);
  useEffect(() => {
    if (ready && toggleTvToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveTv?.(); true;');
    }
  }, [toggleTvToken, ready]);
  useEffect(() => {
    if (ready && toggleFanToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveFan?.(); true;');
    }
  }, [toggleFanToken, ready]);
  useEffect(() => {
    if (ready && toggleAcToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveAirConditioner?.(); true;');
    }
  }, [toggleAcToken, ready]);
  useEffect(() => {
    if (ready && sitSofaToken) {
      webViewRef.current?.injectJavaScript('window.sitActiveSofa?.(); true;');
    }
  }, [sitSofaToken, ready]);
  useEffect(() => {
    if (ready && sitChairToken) {
      webViewRef.current?.injectJavaScript('window.sitActiveChair?.(); true;');
    }
  }, [sitChairToken, ready]);
  useEffect(() => {
    if (ready && pourDrinkToken) {
      webViewRef.current?.injectJavaScript('window.pourActiveDrink?.(); true;');
    }
  }, [pourDrinkToken, ready]);
  useEffect(() => {
    if (ready && waterPlantToken) {
      webViewRef.current?.injectJavaScript('window.waterActivePlant?.(); true;');
    }
  }, [waterPlantToken, ready]);
  useEffect(() => {
    if (ready && chimeClockToken) {
      webViewRef.current?.injectJavaScript('window.chimeActiveClock?.(); true;');
    }
  }, [chimeClockToken, ready]);
  useEffect(() => {
    if (ready && toggleCurtainsToken) {
      webViewRef.current?.injectJavaScript('window.toggleActiveCurtains?.(); true;');
    }
  }, [toggleCurtainsToken, ready]);
  useEffect(() => {
    if (ready && hotspotId) {
      webViewRef.current?.injectJavaScript('window.moveToHotspot?.(' + JSON.stringify(hotspotId) + '); true;');
    }
  }, [hotspotId, ready]);
  const handleMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') setReady(true);
      if (data.type === 'ERROR') setError(data.message);
      if (data.type === 'SELECT_FURNITURE') onSelectFurniture?.(data.label, data.description, data.item);
      if (data.type === 'DOOR_TRANSITION') onDoorTransition?.(data.targetRoomId, data.label);
      if (data.type === 'RESTRICTED_TOUCH') onRestrictedTouch?.(data.label, data.dialogue);
      if (data.type === 'POV_STATE') onPovChange?.(data.mode, data.label, data.direction);
      if (data.type === 'NAV_WARNING') onNavWarning?.(data.message);
      if (data.type === 'NAV_MODE_CHANGED') onNavModeChange?.(data.mode);
      if (data.type === 'HOTSPOT_SELECTED') onHotspotSelected?.(data.id, data.label);
    } catch {}
  };
  return <View style={styles.container}>
    <WebView key={generation} ref={webViewRef} source={source} originWhitelist={['*']}
      onLoadStart={() => { setReady(false); setError(''); }} onMessage={handleMessage}
      onRenderProcessGone={() => { setReady(false); setError('Bộ hiển thị 3D đã dừng do thiếu tài nguyên. Hãy mở lại app.'); }}
      onContentProcessDidTerminate={() => { setReady(false); setError('Bộ hiển thị 3D đã dừng. Hãy mở lại app.'); }}
      onError={() => setError('Không tải được bộ hiển thị 3D. Hãy mở lại app.')}
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === source.baseUrl || request.url === source.baseUrl + '/'}
      javaScriptEnabled scrollEnabled={false} style={styles.container} />
    {!!error && <View style={styles.error}>
      <Text accessibilityRole="alert">{error}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tải lại bộ hiển thị 3D" style={styles.retry}
        onPress={() => { setReady(false); setError(''); setGeneration(value => value + 1); }}>
        <Text>Tải lại 3D</Text>
      </TouchableOpacity>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  error: { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: '#ffffff', padding: 12, borderRadius: 8 },
  retry: { padding: 12, marginTop: 8, backgroundColor: '#d9eee3', borderRadius: 6 },
});
