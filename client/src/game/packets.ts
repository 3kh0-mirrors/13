import {Actor, ClientEvent, newStateData, Packet, PacketDebug, StateData} from "./types";
import {ClientID} from "../../../shared/types";

const DEBUG_SIGN = 0xdeb51a1e;

const readState = (state: StateData, i32: Int32Array, ptr: number): number => {
    state.nextId_ = i32[ptr++];
    state.tic_ = i32[ptr++];
    state.seed_ = i32[ptr++] >>> 0;
    state.mapSeed_ = i32[ptr++] >>> 0;
    const count = i32[ptr++];
    for (let i = 0; i < count; ++i) {
        const hdr = i32[ptr++];
        const ux = i32[ptr++];
        const vy = i32[ptr++];
        const wz = i32[ptr++];
        const ammoData = i32[ptr++];
        const p: Actor = {
            type_: hdr & 7,
            weapon_: (hdr >> 3) & 15,
            s_: (hdr >> 7) & 0xFF,
            anim0_: (hdr >> 15) & 0xFF,
            hp_: (hdr >> 23) & 15,
            sp_: (ux >> 16) & 15,
            detune_: (vy >> 16) & 31,
            animHit_: (wz >> 16) & 31,

            x_: ux & 0xFFFF,
            y_: vy & 0xFFFF,
            z_: wz & 0xFFFF,
            u_: ux >> 21,
            v_: vy >> 21,
            w_: wz >> 21,

            id_: i32[ptr++],
            client_: i32[ptr++],
            btn_: i32[ptr++],

            clipAmmo_: ammoData & 63,
            clipReload_: (ammoData >> 6) & 63,
            mags_: (ammoData >> 12) & 0b1111,
            clipAmmo2_: (ammoData >> 16) & 63,
            weapon2_: (ammoData >> 22) & 0b1111,
            trig_: (ammoData >> 26) & 0b1111,
        };
        state.actors_[p.type_].push(p);
    }
    const statMapSize = i32[ptr++];
    for (let i = 0; i < statMapSize; ++i) {
        state.stats_.set(i32[ptr++], {
            frags_: i32[ptr++],
            scores_: i32[ptr++],
        });
    }
    return ptr;
}
export const unpack = (client: ClientID, i32: Int32Array,/* let */ _events: ClientEvent[] = [], _state?: StateData, _debug?: PacketDebug): Packet => {
    let event_t = i32[2];
    // 10
    let ptr = 3;
    for (; event_t;) {
        const v = i32[ptr++];
        let c = v >> 21;
        _events.push({
            tic_: event_t,
            client_: client,
            btn_: v & 0x1fffff,
        });
        event_t += c;
        if (!c) break;
    }
    if (i32[1] & 2) {
        _state = newStateData();
        ptr = readState(_state, i32, ptr);
    }
    if (process.env.NODE_ENV === "development") {
        if (i32[ptr++] === DEBUG_SIGN) {
            _debug = {
                tic: i32[ptr++],
                nextId: i32[ptr++],
                seed: i32[ptr++] >>> 0,
            };
            if (i32[ptr++] === DEBUG_SIGN) {
                _debug.state = newStateData();
                ptr = readState(_debug.state, i32, ptr);
            }
        }
    }
    return {
        sync_: (i32[1] & 1) as any as boolean,
        tic_: i32[0],
        receivedOnSender_: i32[0] + (i32[1] >> 16),
        events_: _events,
        state_: _state,
        debug: _debug,
    };
}

const writeState = (state: StateData | undefined, i32: Int32Array, ptr: number): number => {
    if (state) {
        i32[ptr++] = state.nextId_;
        i32[ptr++] = state.tic_;
        i32[ptr++] = state.seed_;
        i32[ptr++] = state.mapSeed_;
        const list: Actor[] = [].concat(...state.actors_);
        i32[ptr++] = list.length;
        for (const p of list) {
            // type: 3
            // weapon: 4
            // hp: 5
            // detune: 5
            // animHit: 5
            i32[ptr++] = p.type_ | (p.weapon_ << 3) | (p.s_ << 7) | (p.anim0_ << 15) | (p.hp_ << 23);
            i32[ptr++] = (p.u_ << 21) | (p.sp_ << 16) | p.x_;
            i32[ptr++] = (p.v_ << 21) | (p.detune_ << 16) | p.y_;
            i32[ptr++] = (p.w_ << 21) | (p.animHit_ << 16) | p.z_;
            i32[ptr++] = p.clipAmmo_ | (p.clipReload_ << 6) | (p.mags_ << 12) | (p.clipAmmo2_ << 16) | (p.weapon2_ << 22) | (p.trig_ << 26);
            i32[ptr++] = p.id_;
            i32[ptr++] = p.client_;
            i32[ptr++] = p.btn_;
        }
        i32[ptr++] = state.stats_.size;
        for (const [id, stat] of state.stats_) {
            i32[ptr++] = id;
            i32[ptr++] = stat.frags_;
            i32[ptr++] = stat.scores_;
        }
    }
    return ptr;
}

export const pack = (packet: Packet, i32: Int32Array): ArrayBuffer => {
    i32[0] = packet.tic_;
    // 1 - sync
    // 2 - init-packet
    i32[1] = ((packet.receivedOnSender_ - packet.tic_) << 16) | (packet.sync_ as any) | (!!packet.state_ as any << 1);
    const events = packet.events_;
    events.sort((a, b) => a.tic_ - b.tic_);
    let event_t = events.length ? events[0].tic_ : 0;
    i32[2] = event_t;
    let ptr = 3;
    let i = 0;
    while (i < events.length) {
        const e = events[i++];
        const c = events[i] ? (events[i].tic_ - e.tic_) : 0;
        i32[ptr++] = (c << 21) | e.btn_;
    }
    ptr = writeState(packet.state_, i32, ptr);
    if (process.env.NODE_ENV === "development") {
        if (packet.debug) {
            i32[ptr++] = DEBUG_SIGN;
            i32[ptr++] = packet.debug.tic;
            i32[ptr++] = packet.debug.nextId;
            i32[ptr++] = packet.debug.seed;
            if (packet.debug.state) {
                i32[ptr++] = DEBUG_SIGN;
                ptr = writeState(packet.debug.state, i32, ptr);
            }
        }
    }
    return i32.buffer.slice(0, ptr * 4);
}
