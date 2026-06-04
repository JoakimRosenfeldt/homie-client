import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ListingScreen, MessageCard, useListingColors } from "@/features/listings/components";
import { formatCurrency, formatDate, formatRooms, formatSize } from "@/features/listings/format";
import { getMockApartment } from "@/features/listings/mock-apartments";

export default function ApartmentDetailScreen() {
  const colors = useListingColors();
  const { apartmentId } = useLocalSearchParams<{ apartmentId: string }>();
  const apartment = getMockApartment(apartmentId);
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const interestedButtonRef = useRef<View>(null);
  const [isStickyInterestedRendered, setIsStickyInterestedRendered] = useState(false);
  const [isStickyInterestedVisible, setIsStickyInterestedVisible] = useState(false);

  const handleStickyInterestedExited = useCallback(() => {
    setIsStickyInterestedRendered(false);
  }, []);

  const handleScroll = (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
    interestedButtonRef.current?.measureInWindow((_x, y, _width, height) => {
      const shouldShowStickyInterested = y + height < 0;

      if (shouldShowStickyInterested) {
        setIsStickyInterestedRendered(true);
      }

      setIsStickyInterestedVisible(shouldShowStickyInterested);
    });
  };

  if (!apartment) {
    return (
      <ListingScreen>
        <BackButton />
        <MessageCard
          title="Apartment not found"
          description="This apartment is no longer available in the mock apartment list."
          actionLabel="Go home"
          onActionPress={() => router.replace("/" as never)}
        />
      </ListingScreen>
    );
  }

  return (
    <ListingScreen
      footer={isStickyInterestedRendered ? <StickyInterestedFooter isVisible={isStickyInterestedVisible} /> : undefined}
      footerVisible={isStickyInterestedVisible}
      onFooterExited={handleStickyInterestedExited}
      onScroll={handleScroll}
      scrollEventThrottle={16}>
      <BackButton />

      <View
        style={{
          overflow: "hidden",
          borderRadius: 24,
          borderCurve: "continuous",
          backgroundColor: colors.cardSecondary,
        }}>
        {apartment.imageUrl ? (
          <Image
            source={apartment.imageUrl}
            contentFit="cover"
            transition={180}
            style={{
              width: "100%",
              aspectRatio: isWide ? 1.65 : 1.18,
            }}
          />
        ) : null}
      </View>

      <View ref={interestedButtonRef} collapsable={false}>
        <InterestedButton />
      </View>

      <View style={{ gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text
            selectable
            style={{
              fontSize: isWide ? 38 : 30,
              lineHeight: isWide ? 44 : 35,
              fontWeight: "800",
              color: colors.title,
            }}>
            {apartment.title}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 16,
              lineHeight: 22,
              color: colors.body,
            }}>
            {apartment.location}
          </Text>
        </View>

        <View
          style={{
            flexDirection: isWide ? "row" : "column",
            gap: 12,
          }}>
          <KeyFigure label="Rent" value={formatCurrency(apartment.monthlyRent, apartment.currency)} />
          <KeyFigure label="Available" value={formatDate(apartment.availableFrom)} />
          <KeyFigure label="Lease" value={apartment.leaseTerm} />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <InfoPill label={formatSize(apartment.sizeSqm)} />
          <InfoPill label={formatRooms("bedroom", apartment.bedroomCount)} />
          <InfoPill label={formatRooms("bathroom", apartment.bathroomCount)} />
          <InfoPill label={apartment.furnished ? "Furnished" : "Unfurnished"} />
          <InfoPill label={apartment.floor} />
        </View>

        <View style={{ gap: 8 }}>
          <Text
            selectable
            style={{
              fontSize: 20,
              lineHeight: 25,
              fontWeight: "800",
              color: colors.title,
            }}>
            About this apartment
          </Text>
          <Text
            selectable
            style={{
              fontSize: 15,
              lineHeight: 23,
              color: colors.body,
            }}>
            {apartment.description}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text
            selectable
            style={{
              fontSize: 20,
              lineHeight: 25,
              fontWeight: "800",
              color: colors.title,
            }}>
            Amenities
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {apartment.amenities.map((amenity) => (
              <InfoPill key={amenity} label={amenity} />
            ))}
          </View>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 16,
            gap: 4,
          }}>
          <Text
            selectable
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: colors.body,
            }}>
            Contact
          </Text>
          <Text
            selectable
            style={{
              fontSize: 18,
              lineHeight: 24,
              fontWeight: "800",
              color: colors.title,
            }}>
            {apartment.contactName}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: colors.body,
            }}>
            Deposit is {apartment.depositMonths} months of rent.
          </Text>
        </View>
      </View>
    </ListingScreen>
  );
}

function StickyInterestedFooter({ isVisible }: { isVisible: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((isReduceMotionEnabled) => {
      if (!isMounted) {
        return;
      }

      if (isReduceMotionEnabled) {
        progress.setValue(isVisible ? 1 : 0);
        return;
      }

      Animated.timing(progress, {
        toValue: isVisible ? 1 : 0,
        duration: isVisible ? 320 : 220,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      isMounted = false;
    };
  }, [isVisible, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}>
      <InterestedButton />
    </Animated.View>
  );
}

function InterestedButton() {
  const colors = useListingColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Interested"
      onPress={() => {}}
      style={({ pressed }) => ({
        minHeight: 58,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: colors.accent,
        opacity: pressed ? 0.84 : 1,
      })}>
      <Text
        selectable
        style={{
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "800",
          color: "#FFFFFF",
        }}>
        Interested
      </Text>
    </Pressable>
  );
}

function BackButton() {
  const colors = useListingColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to apartments"
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace("/" as never);
      }}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text
        selectable
        style={{
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "800",
          color: colors.accent,
        }}>
        Back
      </Text>
    </Pressable>
  );
}

function KeyFigure({ label, value }: { label: string; value: string }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 14,
        gap: 4,
      }}>
      <Text
        selectable
        style={{
          fontSize: 13,
          lineHeight: 17,
          color: colors.body,
        }}>
        {label}
      </Text>
      <Text
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: 18,
          lineHeight: 23,
          fontWeight: "800",
          color: colors.title,
        }}>
        {value}
      </Text>
    </View>
  );
}

function InfoPill({ label }: { label: string }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        borderRadius: 999,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 11,
        paddingVertical: 8,
      }}>
      <Text
        selectable
        style={{
          fontSize: 13,
          lineHeight: 16,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
    </View>
  );
}
