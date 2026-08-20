import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  SafeAreaView,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react-native';

import { Button, Badge } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';
import type { StopReferencePhoto, StopReferencePhotoTag } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type StopReferenceCarouselProps = {
  photos?: StopReferencePhoto[];
  stopName?: string;
  onAddPhoto?: (photo: StopReferencePhoto) => void;
};

const TAG_COLORS: Record<StopReferencePhotoTag, { bg: string; text: string }> = {
  Fachada: { bg: '#2563eb', text: '#ffffff' },
  'Portón de Carga': { bg: '#059669', text: '#ffffff' },
  Referencia: { bg: '#d97706', text: '#ffffff' },
  Recepción: { bg: '#7c3aed', text: '#ffffff' },
  Otro: { bg: '#475569', text: '#ffffff' },
};

export function StopReferenceCarousel({
  photos = [],
  stopName = 'Punto de Entrega',
  onAddPhoto,
}: StopReferenceCarouselProps) {
  const theme = useAppTheme();

  const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTag, setNewTag] = useState<StopReferencePhotoTag>('Fachada');
  const [newCaption, setNewCaption] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const activePhoto =
    activeViewerIndex !== null && photos[activeViewerIndex]
      ? photos[activeViewerIndex]
      : null;

  const handlePrevPhoto = () => {
    if (activeViewerIndex !== null && activeViewerIndex > 0) {
      setActiveViewerIndex(activeViewerIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (activeViewerIndex !== null && activeViewerIndex < photos.length - 1) {
      setActiveViewerIndex(activeViewerIndex + 1);
    }
  };

  const handleSaveNewPhoto = () => {
    setIsSavingPhoto(true);
    setTimeout(() => {
      const sampleUrls = [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
      ];
      const randomUrl = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];

      const newPhotoObj: StopReferencePhoto = {
        id: `PH-${Date.now()}`,
        tag: newTag,
        url: randomUrl,
        caption: newCaption.trim() || `Nueva captura de ${newTag}`,
        takenAt: 'Hoy',
      };

      onAddPhoto?.(newPhotoObj);
      setIsSavingPhoto(false);
      setIsAddModalOpen(false);
      setNewCaption('');
    }, 800);
  };

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      {/* CABECERA DEL CARRUSEL */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Camera size={15} color={theme.colors.primary} />
          <Text variant="label" style={{ fontSize: 13, fontWeight: '700' }}>
            Referencias Visuales
          </Text>
          <Badge
            label={`${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`}
            tone="neutral"
            size="sm"
          />
        </View>

        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}
        >
          <Plus size={14} color={theme.colors.primary} />
          <Text
            variant="caption"
            style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}
          >
            Añadir Foto
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA HORIZONTAL DE FOTOS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 10,
          paddingVertical: 2,
        }}
      >
        {photos.map((photo, index) => {
          const tagStyle = TAG_COLORS[photo.tag] || TAG_COLORS.Otro;
          return (
            <TouchableOpacity
              key={photo.id || index}
              activeOpacity={0.85}
              onPress={() => setActiveViewerIndex(index)}
              style={{
                width: 145,
                height: 105,
                borderRadius: 12,
                backgroundColor: theme.colors.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* IMAGEN DE REFERENCIA */}
              <Image
                source={{ uri: photo.url }}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#cbd5e1',
                }}
                resizeMode="cover"
              />

              {/* BADGE DE TIPO DE REFERENCIA */}
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  backgroundColor: tagStyle.bg,
                  paddingHorizontal: 6,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: tagStyle.text,
                    fontSize: 9.5,
                    fontWeight: '800',
                    letterSpacing: 0.2,
                  }}
                >
                  {photo.tag}
                </Text>
              </View>

              {/* ICONO DE VISTA PREVIA EXPANDIR */}
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Eye size={12} color="#ffffff" />
              </View>

              {/* PIE CON CAPTION CORTO */}
              {photo.caption ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: '600',
                    }}
                  >
                    {photo.caption}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {/* TARJETA PARA AGREGAR NUEVA FOTO RÁPIDA */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsAddModalOpen(true)}
          style={{
            width: 110,
            height: 105,
            borderRadius: 12,
            backgroundColor: theme.colors.secondary,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 8,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color={theme.colors.primary} />
          </View>
          <Text
            variant="caption"
            style={{
              color: theme.colors.primary,
              fontWeight: '700',
              fontSize: 11,
              textAlign: 'center',
            }}
          >
            Tomar Foto
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: VISOR DE FOTOS EN PANTALLA COMPLETA
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeViewerIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActiveViewerIndex(null)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: 'rgba(10, 15, 30, 0.96)',
            justifyContent: 'space-between',
          }}
        >
          {/* HEADER DEL VISOR */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: Platform.OS === 'android' ? 40 : 10,
              paddingBottom: 12,
            }}
          >
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {activePhoto && (
                  <View
                    style={{
                      backgroundColor:
                        TAG_COLORS[activePhoto.tag]?.bg || TAG_COLORS.Otro.bg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {activePhoto.tag}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color: '#94a3b8',
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {activeViewerIndex !== null ? activeViewerIndex + 1 : 1} de {photos.length}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: '700',
                  maxWidth: SCREEN_WIDTH * 0.7,
                }}
              >
                {stopName}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setActiveViewerIndex(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* FOTO PRINCIPAL CON NAVEGADORES LATERALES */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              paddingHorizontal: 10,
            }}
          >
            {activePhoto ? (
              <Image
                source={{ uri: activePhoto.url }}
                style={{
                  width: SCREEN_WIDTH - 20,
                  height: SCREEN_WIDTH * 0.85,
                  borderRadius: 16,
                }}
                resizeMode="cover"
              />
            ) : null}

            {/* BOTÓN ANTERIOR */}
            {activeViewerIndex !== null && activeViewerIndex > 0 && (
              <TouchableOpacity
                onPress={handlePrevPhoto}
                style={{
                  position: 'absolute',
                  left: 14,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <ChevronLeft size={26} color="#ffffff" />
              </TouchableOpacity>
            )}

            {/* BOTÓN SIGUIENTE */}
            {activeViewerIndex !== null && activeViewerIndex < photos.length - 1 && (
              <TouchableOpacity
                onPress={handleNextPhoto}
                style={{
                  position: 'absolute',
                  right: 14,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <ChevronRight size={26} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* PIE CON DESCRIPCIÓN Y ACCIONES */}
          <View
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 24 : 16,
              gap: 12,
              borderTopWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {activePhoto?.caption ? (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Info size={14} color="#38bdf8" />
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                    Instrucción / Referencia de Acceso
                  </Text>
                </View>
                <Text style={{ color: '#f8fafc', fontSize: 13, lineHeight: 18 }}>
                  {activePhoto.caption}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 4,
              }}
            >
              {activePhoto?.takenAt && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} color="#94a3b8" />
                  <Text style={{ color: '#94a3b8', fontSize: 11.5 }}>
                    Registrada: {activePhoto.takenAt}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  setActiveViewerIndex(null);
                  setIsAddModalOpen(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#2563eb',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                }}
              >
                <Camera size={14} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  Actualizar Foto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: AÑADIR / ACTUALIZAR FOTO DE REFERENCIA
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsAddModalOpen(false)}
            style={{ flex: 1 }}
          />

          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Platform.OS === 'ios' ? 36 : 24,
              gap: 14,
              borderTopWidth: 2,
              borderColor: theme.colors.border,
            }}
          >
            {/* MANIJA */}
            <View
              style={{
                alignSelf: 'center',
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.border,
                marginBottom: 2,
              }}
            />

            {/* HEADER */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text variant="title" style={{ fontSize: 16, fontWeight: '700' }}>
                    Nueva Foto de Referencia
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                    {stopName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={theme.colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* SELECCIÓN DE TIPO / ETIQUETA */}
            <View style={{ gap: 6 }}>
              <Text variant="label" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                Tipo de Referencia Visual:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['Fachada', 'Portón de Carga', 'Referencia', 'Recepción', 'Otro'] as StopReferencePhotoTag[]).map(
                  (tag) => {
                    const isSelected = newTag === tag;
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => setNewTag(tag)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected ? '#ffffff' : theme.colors.foreground,
                          }}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>

            {/* NOTA O INSTRUCCIÓN */}
            <View style={{ gap: 6 }}>
              <Text variant="label" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                Instrucción / Detalle para otros choferes:
              </Text>
              <TextInput
                value={newCaption}
                onChangeText={setNewCaption}
                placeholder="Ej. Portón negro sobre la Calle 4, tocar timbre rojo."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 12,
                  fontSize: 13,
                  color: theme.colors.foreground,
                  minHeight: 60,
                }}
              />
            </View>

            {/* BOTONES */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancelar"
                  variant="outline"
                  size="md"
                  onPress={() => setIsAddModalOpen(false)}
                  disabled={isSavingPhoto}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1.6 }}>
                <Button
                  label={isSavingPhoto ? 'Guardando...' : 'Tomar y Guardar'}
                  icon={CheckCircle2}
                  variant="primary"
                  size="md"
                  onPress={handleSaveNewPhoto}
                  loading={isSavingPhoto}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
