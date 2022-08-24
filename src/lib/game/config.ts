export const DEV_MODE = process.env.NODE_ENV === "development";

export const DEBUG_TERM = 1;

export const enum Const {
    NetFq = 60,
    NetDt = 1.0 / NetFq,
    InputDelay = 8,
    Prediction = 1,
    RLE = 1,

    AnglesRes = 16,
    ViewAngleRes = 256,
}

export const DEBUG_LAG_ENABLED = DEV_MODE;
export const enum DebugLag {
    LagMin = 20,
    LagMax = 200,
    PacketLoss = 0.05,
    // PacketLoss = 0.5,
}