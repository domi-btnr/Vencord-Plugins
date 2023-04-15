/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addBadge, BadgePosition, ProfileBadge, removeBadge } from "@api/Badges";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";
import { User } from "discord-types/general";

interface CustomBadges {
    [key: string]: string[];
}

interface BadgeCache {
    badges: CustomBadges;
    expires: number;
}

const API_URL = "https://clientmodbadges-api.herokuapp.com";

const cache = new Map<string, BadgeCache>();
const EXPIRES = 1000 * 60 * 15;

const fetchBadges = (id: string): CustomBadges | undefined => {
    const cachedValue = cache.get(id);
    if (!cache.has(id) || (cachedValue && cachedValue.expires < Date.now())) {
        fetch(`${API_URL}/users/${id}`)
            .then(res => res.json() as Promise<CustomBadges>)
            .then(body => {
                cache.set(id, { badges: body, expires: Date.now() + EXPIRES });
                return body;
            });
    } else if (cachedValue) {
        return cachedValue.badges;
    }
};

const BadgeComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    style={{ width: "22px", height: "22px", transform: name.includes("Replugged") ? "scale(0.9)" : null, margin: "0 2px" }}
                />
            )}
        </Tooltip>
    );
};

const GlobalBadges = ({ user }: { user: User; }) => {
    const [badges, setBadges] = React.useState<CustomBadges>({});
    React.useEffect(() => setBadges(fetchBadges(user.id) ?? {}), [user.id]);

    if (!badges) return null;
    const globalBadges: JSX.Element[] = [];

    for (const [mod, modBadges] of Object.entries(badges)) {
        if (mod.toLowerCase() === "vencord") continue;
        if (mod.toLowerCase() === "badgevault") {
            for (const badge of modBadges) {
                globalBadges.push(<BadgeComponent name={noPrefix() ? `${badge.name}` : `${mod} | ${badge.name}`} img={badge.badge} />);
            }
            continue;
        }
        for (const badge of modBadges) {
            if (typeof badge !== "string") continue;
            const badgeImg = `${API_URL}/badges/${mod}/${badge.replace(mod, "").trim().split(" ")[0]}`;
            const _ = {
                "hunter": "Bug Hunter",
                "early": "Early User"
            };
            const cleanName = _[badge] || badge.replace(mod, "").trim();
            const badgeName = `${mod} ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
            globalBadges.push(<BadgeComponent name={badgeName} img={badgeImg} />);
        }
    }

    return (
        <div className="vc-global-badges" style={{ alignItems: "center", display: "flex" }}>
            {globalBadges}
        </div>
    );
};

const Badge: ProfileBadge = {
    component: b => <GlobalBadges {...b} />,
    position: BadgePosition.START,
    shouldShow: userInfo => !!Object.keys(fetchBadges(userInfo.user.id) ?? {}).length,
    key: "GlobalBadges"
};

const noPrefix = () => Vencord.Settings.plugins.GlobalBadges.noPrefix;

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    authors: [{ name: "HypedDomi", id: 354191516979429376n }],

    start: () => addBadge(Badge),
    stop: () => removeBadge(Badge),

    options: {
        noPrefix: {
            type: OptionType.BOOLEAN,
            description: "Hide Prefixes for Custom Badges",
            default: false,
            restartNeeded: false
        }
    }
});