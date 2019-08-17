exports.rooms = [
  {
    name: "living",
    motion_sensor_topics: ["motion/living/status"],
    light_topics: ["light/living/command"],
    nightTimeOnly: true,
  },
  {
    name: "kitchen",
    motion_sensor_topics: ["motion/kitchen/status"],
    light_topics: ["light/kitchen/command"],
    ac_command_topics: ['ac/kitchen/command'],
    nightTimeOnly: true,
  },
  {
    name: "corridor",
    motion_sensor_topics: ["motion/corridor/status","motion/bathroom/status","motion/entrance/status"],
    light_topics: ["light/corridor/command","light/bathroom/command","light/entrance/command"],
    nightTimeOnly: false,
  },
  {
    name: "toilet",
    motion_sensor_topics: ["motion/toilet/status"],
    light_topics: ["light/toilet/command"],
    nightTimeOnly: false,
  },
  {
    name: "bedroom",
    motion_sensor_topics: ["motion/bedroom/status"],
    light_topics: ["light/bedroom/command"],
    ac_command_topics: ['ac/bedroom/command'],
    nightTimeOnly: true,
  },
];
