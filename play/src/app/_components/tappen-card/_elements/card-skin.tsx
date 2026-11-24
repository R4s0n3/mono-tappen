"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { cardFaceSkin, patternOverlay, type PlaySkin } from "@/shared/own-skin";

export type RARITY_TYPE = "common" | "rare" | "epic" | "legendary";

export type CardSkinItem = {
  font: {
    type: string;
    color: string;
  };
  border: {
    frame: string;
    rarity: RARITY_TYPE;
  };
  background: {
    type: string;
    colors: {
      primary: string;
      secondary: string;
      highlight?: string;
    };
    animation: string;
  };
};

type CardSkinProps = {
  children: React.ReactNode;
  skinId?: string;
  skinObject?: CardSkinItem;
  /** Equipped own skin. When it is safe, it replaces the shop skin. */
  playSkin?: PlaySkin | null;
};

export type SkinPatternOverlay = {
  backgroundImage: string;
  backgroundSize: string;
  opacity: number;
};

export type ResolvedCardSkin = {
  skin: CardSkinItem;
  overlay: SkinPatternOverlay | null;
  /** Own skin pattern name. Null on the default skin and on shop skins. */
  pattern: string | null;
};

export const defaultSkin: CardSkinItem = {
  font: {
    type: "serif",
    color: "mid",
  },
  border: {
    frame: "classic",
    rarity: "common",
  },
  background: {
    type: "radial",
    colors: {
      primary: "#eaeaef",
      secondary: "#f5f5fa",
    },
    animation: "liquid",
  },
};

function createDynamicBackgroundStyle(styleObj: CardSkinItem["background"]) {
  const { type, colors } = styleObj;
  const { primary, secondary, highlight } = colors;

  const gradientType =
    type === "radial" ? "radial-gradient" : "linear-gradient";
  const colorStop = highlight ? `, ${highlight}` : "";

  return {
    backgroundImage: `${gradientType}(${secondary}, ${primary}${colorStop})`,
    backgroundSize: "300% 300%",
  };
}

function readOverlay(
  value: ReturnType<typeof patternOverlay>,
): SkinPatternOverlay | null {
  if (!value) return null;
  return {
    backgroundImage: value.backgroundImage,
    backgroundSize: value.backgroundSize,
    opacity: value.opacity,
  };
}

/** Shop skin, premium catalog skin, or equipped own skin. One lookup for both faces. */
export function useResolvedCardSkin(
  skinId?: string,
  skinObject?: CardSkinItem,
  playSkin?: PlaySkin | null,
): ResolvedCardSkin {
  const face = cardFaceSkin(skinId ?? "", playSkin);
  const ownSkin = face.source === "own" ? face.playSkin : null;

  const { data: fetchedSkin } = api.skin.getStyle.useQuery(skinId ?? "", {
    enabled: !!skinId && !skinObject && !ownSkin,
    retry: 2,
    staleTime: 300000,
  });

  const [cardSkin, setCardSkin] = useState<CardSkinItem>(
    ownSkin ?? skinObject ?? defaultSkin,
  );

  useEffect(() => {
    if (ownSkin) return;
    if (fetchedSkin) {
      setCardSkin(fetchedSkin);
    }
  }, [fetchedSkin, ownSkin]);

  useEffect(() => {
    if (ownSkin) {
      setCardSkin(ownSkin);
      return;
    }
    if (skinObject) {
      setCardSkin(skinObject);
    }
  }, [skinObject, ownSkin]);

  const overlay = ownSkin
    ? readOverlay(patternOverlay(ownSkin.pattern, ownSkin.patternColor))
    : null;

  return {
    skin: cardSkin,
    overlay,
    pattern: ownSkin?.pattern ?? null,
  };
}

export function CardSkinFrame({
  resolved,
  children,
  className = "",
}: {
  resolved: ResolvedCardSkin;
  children: React.ReactNode;
  className?: string;
}) {
  const { skin, overlay } = resolved;
  const { dynamicBackground, outterClasses, innerClasses } = useMemo(() => {
    const { font, border, background } = skin;
    const { type: fontStyle, color: fontColor } = font;
    const { frame, rarity } = border;
    const { animation } = background;

    return {
      dynamicBackground: createDynamicBackgroundStyle(background),
      outterClasses: [
        `font-${fontStyle}`,
        `fontStyle_${fontColor}`,
        `animate-${animation}`,
      ],
      innerClasses: [rarity, `frame_${frame}`],
    };
  }, [skin]);

  return (
    <div
      style={dynamicBackground}
      className={`relative size-full overflow-hidden rounded p-2 ${outterClasses.join(" ")} ${className}`}
    >
      {overlay ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={overlay}
        />
      ) : null}
      <div
        className={`skin-border ${innerClasses.join(" ")} h-full w-full p-2 lg:gap-6 ${overlay ? "relative z-[1]" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

const CardSkin = memo(function CardSkin(props: CardSkinProps) {
  const { children, skinId, skinObject, playSkin } = props;
  const resolved = useResolvedCardSkin(skinId, skinObject, playSkin);
  return <CardSkinFrame resolved={resolved}>{children}</CardSkinFrame>;
});

export default CardSkin;
