"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { CardBack } from "@/app/_components/tappen-card/card-back";
import CardSkin, { type CardSkinItem } from "@/app/_components/tappen-card/_elements/card-skin";
import { api } from "@/trpc/react";
import { ownSkinCatalog, ownSkinCopy, patternOverlay, type OwnSkinConfig, type PlaySkin } from "@/shared/own-skin";
import {
  accountAccess,
  applyDraftChoice,
  builderSurfacePrompt,
  canCreateOwnSkin,
  canMutateSkins,
  cardBackInputForOwnSkin,
  choiceLabel,
  defaultOwnSkinDraft,
  draftFromConfig,
  draftFromPlaySkin,
  draftMatchesPlaySkin,
  palettePrimary,
  previewOwnSkin,
  readSkinName,
  saveAction,
  skinBuilderCopy,
  skinSlotLabel,
  suggestSkinName,
} from "@/shared/skin-builder";

const chipBase =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-400 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tappen-sunset-500 px-6 text-base font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-tappen-blue-800 px-5 text-sm font-semibold text-tappen-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-400 disabled:cursor-not-allowed disabled:opacity-40";
const textButton =
  "inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-tappen-blue-200";
const legendClass = "text-xs font-semibold uppercase tracking-wide text-tappen-blue-200";

function chipClass(selected: boolean) {
  return `${chipBase} ${selected ? "bg-tappen-sunset-500 text-tappen-blue-900" : "bg-tappen-blue-800 text-tappen-blue-100"}`;
}

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) return null;
  return typeof data.code === "string" ? data.code : null;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return skinBuilderCopy.errorGeneric;
}

function PromptLink({ href, className, children }: { href: string; className: string; children: string }) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function faceItem(playSkin: PlaySkin): CardSkinItem {
  return {
    font: { type: playSkin.font.type, color: playSkin.font.color },
    border: { frame: playSkin.border.frame, rarity: playSkin.border.rarity },
    background: {
      type: playSkin.background.type,
      colors: {
        primary: playSkin.background.colors.primary,
        secondary: playSkin.background.colors.secondary,
      },
      animation: playSkin.background.animation,
    },
  };
}

function faceOverlay(playSkin: PlaySkin) {
  const overlay = patternOverlay(playSkin.pattern, playSkin.patternColor);
  if (!overlay) return null;
  return {
    backgroundImage: overlay.backgroundImage,
    backgroundSize: overlay.backgroundSize,
    opacity: overlay.opacity,
  };
}

function LiveCard({ playSkin, face }: { playSkin: PlaySkin; face: "front" | "back" }) {
  const back = cardBackInputForOwnSkin(playSkin);
  const turned = face === "back";

  return (
    <div className="skin-builder-card card-flip-scene relative aspect-[5/7] w-full">
      <div className="card-flip-root relative h-full w-full">
        <div
          className="card-flip transition-transform duration-500 motion-reduce:transition-none"
          style={{ transform: turned ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className="card-flip-face" aria-hidden={turned}>
            <div className="skin-builder-face">
              <CardSkin skinObject={faceItem(playSkin)} overlay={faceOverlay(playSkin)} enableTilt={false}>
                <div className="flex h-full min-h-0 flex-col justify-between p-[14%]">
                  <p className="text-2xl leading-tight">{skinBuilderCopy.sample}</p>
                  <span className="font-sans text-xs font-semibold uppercase tracking-wide opacity-60">
                    {skinBuilderCopy.previewTag}
                  </span>
                </div>
              </CardSkin>
            </div>
          </div>
          <div className="card-flip-face card-flip-face-back" aria-hidden={!turned}>
            <div className="skin-builder-face">
              {back ? (
                <CardBack
                  primary={back.primary}
                  secondary={back.secondary}
                  highlight={back.highlight}
                  rarity={back.rarity}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  note,
  group,
  value,
  options,
  onPick,
}: {
  label: string;
  note?: string;
  group: string;
  value: string;
  options: readonly string[];
  onPick: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={legendClass}>
        {label}
        {note ? <span className="ml-2 font-sans normal-case tracking-normal text-tappen-blue-300">{note}</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onPick(option)}
            className={`${chipClass(option === value)} ${group === "fonts" ? `font-${option}` : ""}`}
          >
            {choiceLabel(group, option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SkinBuilder({ signedIn }: { signedIn?: boolean }) {
  const prompt = builderSurfacePrompt("hub");
  const entitlement = api.user.entitlement.useQuery(undefined, {
    enabled: signedIn !== false,
    retry: false,
  });
  const access = accountAccess({
    signedInProp: signedIn,
    pending: signedIn !== false && entitlement.isPending,
    success: entitlement.isSuccess,
    unauthorized: errorCode(entitlement.error) === "UNAUTHORIZED",
    premium: entitlement.data?.premium === true,
  });
  const canEdit = canMutateSkins(access);
  const list = api.ownSkin.list.useQuery(undefined, { enabled: canEdit, retry: false });
  const equipped = api.ownSkin.equipped.useQuery(undefined, {
    enabled: access === "readonly",
    retry: false,
  });
  const utils = api.useUtils();

  const refresh = () => {
    void utils.ownSkin.list.invalidate();
    void utils.ownSkin.equipped.invalidate();
  };
  const createSkin = api.ownSkin.create.useMutation({ onSuccess: refresh });
  const updateSkin = api.ownSkin.update.useMutation({ onSuccess: refresh });
  const removeSkin = api.ownSkin.delete.useMutation({ onSuccess: refresh });
  const equipSkin = api.ownSkin.equip.useMutation({ onSuccess: refresh });
  const unequipSkin = api.ownSkin.unequip.useMutation({ onSuccess: refresh });

  const [draft, setDraft] = useState<OwnSkinConfig>(defaultOwnSkinDraft);
  const [name, setName] = useState(() => suggestSkinName(defaultOwnSkinDraft().palette, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [face, setFace] = useState<"front" | "back">("front");
  const [confirmDrop, setConfirmDrop] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hydrated = useRef(false);
  const touched = useRef(false);

  useEffect(() => {
    if (hydrated.current || touched.current) return;
    if (access === "edit") {
      if (!list.isSuccess) return;
      hydrated.current = true;
      const skins = list.data.skins;
      const current = skins.find((skin) => skin.equipped && skin.config) ?? skins.find((skin) => skin.config);
      if (!current?.config) return;
      const painted = previewOwnSkin(current.config);
      if (!painted.ok) return;
      setEditingId(current.id);
      setName(current.name);
      setDraft(draftFromConfig(painted.config));
      return;
    }
    if (access === "readonly") {
      if (equipped.isLoading) return;
      hydrated.current = true;
      const next = equipped.data?.playSkin ? draftFromPlaySkin(equipped.data.playSkin) : null;
      if (next) setDraft(next);
    }
  }, [access, equipped.data, equipped.isLoading, list.data, list.isSuccess]);

  const preview = useMemo(() => previewOwnSkin(draft), [draft]);
  const fallback = useMemo(() => {
    const next = previewOwnSkin(defaultOwnSkinDraft());
    return next.ok ? next.playSkin : null;
  }, []);
  const liveSkin = preview.ok ? preview.playSkin : fallback;
  const count = list.data?.skins.length ?? 0;
  const action = saveAction({ editing: editingId !== null, count });
  const busy =
    createSkin.isPending ||
    updateSkin.isPending ||
    removeSkin.isPending ||
    equipSkin.isPending ||
    unequipSkin.isPending;
  const equippedId = list.data?.equippedId ?? null;
  const classicOn = list.isSuccess && equippedId === null;
  const drifted =
    access === "readonly" &&
    equipped.data?.playSkin != null &&
    liveSkin != null &&
    !draftMatchesPlaySkin(draft, equipped.data.playSkin);

  function choose(key: string, value: string) {
    touched.current = true;
    setNotice(null);
    setDraft((current) => applyDraftChoice(current, key, value));
  }

  async function persist(): Promise<string | null> {
    if (!canEdit || busy) return null;
    const named = readSkinName(name);
    if (!named.ok) {
      setNotice(named.message);
      return null;
    }
    const painted = previewOwnSkin(draft);
    if (!painted.ok) {
      setNotice(painted.message);
      return null;
    }
    try {
      if (editingId) {
        const saved = await updateSkin.mutateAsync({
          id: editingId,
          name: named.name,
          config: painted.config,
        });
        setName(saved.name);
        return saved.id;
      }
      if (action === "blocked") {
        setNotice(ownSkinCopy.limit);
        return null;
      }
      const saved = await createSkin.mutateAsync({ name: named.name, config: painted.config });
      setEditingId(saved.id);
      setName(saved.name);
      return saved.id;
    } catch (error) {
      setNotice(errorMessage(error));
      return null;
    }
  }

  function startNew() {
    touched.current = true;
    setEditingId(null);
    setConfirmDrop(false);
    const next = defaultOwnSkinDraft();
    setDraft(next);
    const taken = (list.data?.skins ?? []).map((skin) => skin.name);
    setName(suggestSkinName(next.palette, taken));
    setNotice(canEdit && !canCreateOwnSkin(count) ? ownSkinCopy.limit : null);
  }

  function selectSkin(skin: { id: string; name: string; config: unknown }) {
    touched.current = true;
    setConfirmDrop(false);
    const painted = previewOwnSkin(skin.config);
    if (!painted.ok) {
      setEditingId(skin.id);
      setName(skin.name);
      setNotice(skinBuilderCopy.unreadable);
      return;
    }
    setEditingId(skin.id);
    setName(skin.name);
    setDraft(draftFromConfig(painted.config));
    setNotice(null);
  }

  const slotCount = canEdit && list.isSuccess ? count : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-48 font-sans text-tappen-blue-100">
      <div className="flex w-full flex-col gap-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-bang text-4xl text-tappen-blue-50 sm:text-5xl">{skinBuilderCopy.title}</h1>
            <p className="mt-1 max-w-md text-sm leading-6 text-tappen-blue-200">{skinBuilderCopy.lede}</p>
          </div>
          <p className="shrink-0 font-bang text-2xl text-tappen-sunset-300" aria-label={skinBuilderCopy.slotsTitle}>
            {skinSlotLabel(slotCount)}
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="mx-auto flex w-full max-w-[18rem] flex-col gap-3 lg:sticky lg:top-48">
            {liveSkin ? (
              <button
                type="button"
                className="block w-full text-left"
                aria-pressed={face === "back"}
                aria-label={face === "back" ? skinBuilderCopy.flipFace : skinBuilderCopy.flipBack}
                onClick={() => setFace((current) => (current === "front" ? "back" : "front"))}
              >
                <LiveCard playSkin={liveSkin} face={face} />
              </button>
            ) : null}
            <button
              type="button"
              className={secondaryButton}
              aria-pressed={face === "back"}
              onClick={() => setFace((current) => (current === "front" ? "back" : "front"))}
            >
              {face === "back" ? skinBuilderCopy.flipFace : skinBuilderCopy.flipBack}
            </button>
          </div>

          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                const id = await persist();
                if (id) setNotice(skinBuilderCopy.savedNotice);
              })();
            }}
          >
            {access === "loading" ? <p className="text-sm text-tappen-blue-200">{skinBuilderCopy.checking}</p> : null}
            {access === "error" ? (
              <div className="flex flex-col items-start gap-2 rounded-2xl bg-tappen-blue-800/80 p-4">
                <p className="text-sm leading-6">{skinBuilderCopy.checkFailed}</p>
                <button type="button" className={secondaryButton} onClick={() => void entitlement.refetch()}>
                  {skinBuilderCopy.retry}
                </button>
              </div>
            ) : null}
            {access === "guest" ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl bg-tappen-blue-800/80 p-4">
                <p className="text-sm leading-6">{skinBuilderCopy.guest}</p>
                <PromptLink href={prompt.signInHref} className={primaryButton}>
                  {prompt.signInAction}
                </PromptLink>
              </div>
            ) : null}
            {access === "readonly" ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl bg-tappen-blue-800/80 p-4">
                <p className="text-sm leading-6">{skinBuilderCopy.premium}</p>
                <p className="text-sm leading-6 text-tappen-blue-200">
                  {equipped.isLoading
                    ? skinBuilderCopy.checking
                    : equipped.data
                      ? drifted
                        ? skinBuilderCopy.lapsedDrift
                        : skinBuilderCopy.lapsedSame
                      : skinBuilderCopy.previewOnly}
                </p>
                {prompt.premiumHref && prompt.premiumAction ? (
                  <PromptLink href={prompt.premiumHref} className={primaryButton}>
                    {prompt.premiumAction}
                  </PromptLink>
                ) : null}
              </div>
            ) : null}

            {canEdit ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className={legendClass}>{skinBuilderCopy.saved}</h2>
                  <button type="button" className={textButton} onClick={startNew}>
                    {skinBuilderCopy.newLook}
                  </button>
                </div>
                {list.isSuccess && list.data.skins.length === 0 ? (
                  <p className="text-sm text-tappen-blue-200">{skinBuilderCopy.empty}</p>
                ) : null}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    aria-pressed={classicOn}
                    disabled={!canEdit || busy || !list.isSuccess || classicOn}
                    onClick={() => {
                      void unequipSkin.mutateAsync().then(
                        () => setNotice(skinBuilderCopy.classicHint),
                        (error: unknown) => setNotice(errorMessage(error)),
                      );
                    }}
                    className={`${chipClass(classicOn)} shrink-0`}
                  >
                    {skinBuilderCopy.classic}
                    {classicOn ? <span className="ml-2 text-xs">{skinBuilderCopy.wearing}</span> : null}
                  </button>
                  {(list.data?.skins ?? []).map((skin) => {
                    const selected = skin.id === editingId;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectSkin(skin)}
                        className={`${chipClass(selected)} max-w-[14rem] shrink-0 gap-2`}
                      >
                        <span
                          aria-hidden
                          className="size-3 shrink-0 rounded-full ring-1 ring-tappen-blue-50/40"
                          style={{ backgroundColor: swatchFor(skin.config) }}
                        />
                        <span className="truncate">{skin.name}</span>
                        {skin.equipped ? <span className="text-xs">{skinBuilderCopy.wearing}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className={legendClass}>{skinBuilderCopy.name}</span>
              <input
                value={name}
                maxLength={24}
                autoComplete="off"
                placeholder={skinBuilderCopy.namePlaceholder}
                onChange={(event) => {
                  touched.current = true;
                  setName(event.target.value);
                }}
                className="min-h-11 w-full rounded-2xl bg-tappen-blue-800 px-4 text-base text-tappen-blue-50 outline-none ring-1 ring-inset ring-tappen-blue-300/40 focus:ring-tappen-sunset-400"
              />
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className={legendClass}>{skinBuilderCopy.palette}</legend>
              <div className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-8">
                {ownSkinCatalog.palettes.map((palette) => {
                  const selected = draft.palette === palette;
                  return (
                    <button
                      key={palette}
                      type="button"
                      aria-pressed={selected}
                      aria-label={choiceLabel("palettes", palette)}
                      onClick={() => choose("palette", palette)}
                      className={`inline-flex size-11 items-center justify-center rounded-full ring-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-400 ${selected ? "ring-tappen-sunset-400 ring-offset-2 ring-offset-tappen-blue-700" : "ring-tappen-blue-50/70"}`}
                      style={{ backgroundColor: palettePrimary(palette) }}
                    />
                  );
                })}
              </div>
            </fieldset>

            <ChoiceRow
              label={skinBuilderCopy.gradient}
              group="gradients"
              value={draft.gradient}
              options={ownSkinCatalog.gradients}
              onPick={(value) => choose("gradient", value)}
            />
            <ChoiceRow
              label={skinBuilderCopy.pattern}
              group="patterns"
              value={draft.pattern}
              options={ownSkinCatalog.patterns}
              onPick={(value) => choose("pattern", value)}
            />
            <ChoiceRow
              label={skinBuilderCopy.frame}
              note={skinBuilderCopy.frameNote}
              group="tiers"
              value={draft.tier}
              options={ownSkinCatalog.tiers}
              onPick={(value) => choose("tier", value)}
            />
            <ChoiceRow
              label={skinBuilderCopy.font}
              group="fonts"
              value={draft.font}
              options={ownSkinCatalog.fonts}
              onPick={(value) => choose("font", value)}
            />
            <ChoiceRow
              label={skinBuilderCopy.ink}
              group="fontColors"
              value={draft.fontColor}
              options={ownSkinCatalog.fontColors}
              onPick={(value) => choose("fontColor", value)}
            />

            {notice ? (
              <p role="status" className="text-sm leading-6 text-tappen-sunset-200">
                {notice}
              </p>
            ) : null}
            {canEdit && action === "blocked" && editingId === null ? (
              <p className="text-sm leading-6 text-tappen-blue-200">{ownSkinCopy.limit}</p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" className={primaryButton} disabled={!canEdit || busy || action === "blocked"}>
                {editingId ? skinBuilderCopy.update : skinBuilderCopy.save}
              </button>
              <button
                type="button"
                className={secondaryButton}
                disabled={!canEdit || busy || (editingId === null && action === "blocked")}
                onClick={() => {
                  void persist().then(async (id) => {
                    if (!id) return;
                    try {
                      await equipSkin.mutateAsync({ id });
                      setNotice(skinBuilderCopy.wornNotice);
                    } catch (error) {
                      setNotice(errorMessage(error));
                    }
                  });
                }}
              >
                {skinBuilderCopy.wear}
              </button>
              {editingId ? (
                confirmDrop ? (
                  <>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={busy}
                      onClick={() => {
                        void removeSkin.mutateAsync({ id: editingId }).then(
                          () => {
                            setEditingId(null);
                            setConfirmDrop(false);
                            const next = defaultOwnSkinDraft();
                            setDraft(next);
                            const taken = (list.data?.skins ?? [])
                              .filter((skin) => skin.id !== editingId)
                              .map((skin) => skin.name);
                            setName(suggestSkinName(next.palette, taken));
                            setNotice(skinBuilderCopy.droppedNotice);
                          },
                          (error: unknown) => setNotice(errorMessage(error)),
                        );
                      }}
                    >
                      {skinBuilderCopy.dropAsk}
                    </button>
                    <button type="button" className={textButton} onClick={() => setConfirmDrop(false)}>
                      {skinBuilderCopy.keep}
                    </button>
                  </>
                ) : (
                  <button type="button" className={textButton} disabled={busy} onClick={() => setConfirmDrop(true)}>
                    {skinBuilderCopy.drop}
                  </button>
                )
              ) : null}
            </div>
          </form>
        </div>

        <Link href="/?page=profile" className={`${textButton} self-start`}>
          {skinBuilderCopy.backHome}
        </Link>
      </div>
    </div>
  );
}

function swatchFor(config: unknown) {
  const painted = previewOwnSkin(config);
  if (!painted.ok) return palettePrimary("mist");
  return palettePrimary(painted.config.palette);
}
