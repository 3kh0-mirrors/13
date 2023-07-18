import {button} from "../graphics/gui.js";
import {
    BloodMode,
    DEFAULT_FRAMERATE_LIMIT,
    hasSettingsFlag,
    setSetting,
    Setting,
    SettingFlag,
    settings,
    toggleSettingsFlag,
} from "../game/settings.js";
import {modalPopup} from "../modals/index.js";
import {L} from "../assets/text.js";

export const guiSettingsPanel = (x: number, y: number) => {
    if (
        button(
            "sounds",
            hasSettingsFlag(SettingFlag.Sound) ? `🔊 ${L("settings_sounds")} ✓` : `🔇 ${L("settings_sounds")} □`,
            x - 50,
            y - 70,
            {
                w: 100,
                h: 20,
            },
        )
    ) {
        toggleSettingsFlag(SettingFlag.Sound);
    }
    if (
        button(
            "music",
            `🎵 ${L("settings_music")} ` + (hasSettingsFlag(SettingFlag.Music) ? "✓" : "□"),
            x - 50,
            y - 40,
            {
                w: 100,
                h: 20,
            },
        )
    ) {
        toggleSettingsFlag(SettingFlag.Music);
    }
    if (
        button(
            "speech",
            `💬 ${L("settings_speech")} ` + (hasSettingsFlag(SettingFlag.Speech) ? "✓" : "□"),
            x - 50,
            y - 10,
            {
                w: 100,
                h: 20,
            },
        )
    ) {
        toggleSettingsFlag(SettingFlag.Speech);
    }

    const bloodModeText = ["️‍🩹 FX: " + L("settings_none"), "🩸 FX: " + L("fx_blood"), "🎨 FX: " + L("fx_paint")];
    if (
        button("blood", bloodModeText[settings[Setting.Blood]], x - 65, y + 20, {
            w: 80,
            h: 20,
        })
    ) {
        setSetting(Setting.Blood, ((settings[Setting.Blood] + 1) % 3) as BloodMode);
    }

    let particlesMod = settings[Setting.Particles];
    const particlesText = particlesMod > 0 ? "X" + particlesMod : L("settings_none");
    if (
        button("particles", "️✨ " + particlesText, x + 25, y + 20, {
            w: 40,
            h: 20,
        })
    ) {
        particlesMod *= 2;
        if (particlesMod <= 0) {
            particlesMod = 0.5;
        }
        if (particlesMod > 4) {
            particlesMod = 0;
        }
        setSetting(Setting.Particles, particlesMod);
    }
    if (
        button(
            "highDPI",
            `🖥️ ${L("settings_high_dpi")} ${hasSettingsFlag(SettingFlag.HighDPI) ? "✓" : "□"}`,
            x - 85,
            y + 50,
            {
                w: 80,
                h: 20,
            },
        )
    ) {
        toggleSettingsFlag(SettingFlag.HighDPI);
    }

    const frameRateCap = settings[Setting.FrameRateCap];
    if (
        button(
            "frameRateCap",
            L("settings_fps_limit") + ": " + (frameRateCap > 0 ? frameRateCap + "hz" : "OFF"),
            x + 5,
            y + 50,
            {
                w: 80,
                h: 20,
            },
        )
    ) {
        setSetting(Setting.FrameRateCap, frameRateCap > 0 ? 0 : DEFAULT_FRAMERATE_LIMIT);
    }

    const antialiasing = hasSettingsFlag(SettingFlag.Antialiasing);
    if (
        button("antialiasing", `𓊍 ${L("settings_aa")} ${antialiasing ? "✓" : "□"}`, x - 50, y + 80, {
            w: 100,
            h: 20,
        })
    ) {
        modalPopup({
            title: L("popup_aa_title"),
            desc: L("popup_aa_desc"),
        })
            .then(() => {
                toggleSettingsFlag(SettingFlag.Antialiasing);
                location.reload();
            })
            .catch(() => {
                //
            });
    }
};
