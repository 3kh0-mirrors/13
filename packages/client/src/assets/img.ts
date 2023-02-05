export const Img = {
    box: 0,
    box_lt: 1,
    box_t: 2,
    box_t1: 3,
    box_l: 4,
    box_r: 5,
    circle_4: 6,
    circle_4_60p: 7,
    circle_4_70p: 8,
    circle_16: 9,

    weapon0: 10,
    weapon1: 11,
    weapon2: 12,
    weapon3: 13,
    weapon4: 14,
    weapon5: 15,
    weapon6: 16,
    weapon7: 17,
    weapon8: 18,
    weapon9: 19,

    avatar0: 20,
    avatar1: 21,
    avatar2: 22,
    avatar3: 23,
    avatar4: 24,
    avatar5: 25,
    avatar6: 26,
    avatar7: 27,
    avatar8: 28,
    avatar9: 29,
    avatar10: 30,
    avatar11: 31,
    avatar12: 32,
    avatar13: 33,
    avatar14: 34,

    npc0: 35,
    npc1: 36,
    npc2: 37,
    npc3: 38,
    npc4: 39,
    npc5: 40,
    npc6: 41,
    npc7: 42,

    barrel0: 43,
    barrel1: 44,
    barrel2: 45,

    item0: 46,
    item1: 47,
    item2: 48,
    item3: 49,
    item4: 50,
    item5: 51,

    tree0: 52,
    tree1: 53,
    tree2: 54,
    tree3: 55,
    tree4: 56,
    tree5: 57,

    particle_flesh0: 58,
    particle_flesh1: 59,
    particle_shell: 60,

    logo_title: 61,

    num_avatars: 15,
    num_npc: 8,
} as const;
export type Img = (typeof Img)[keyof typeof Img];