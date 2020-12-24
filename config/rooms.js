module.exports = [
  {
    name: "living",

    // Experimental syntax
    motion_sensors: [
      {topic: "motion/living/status", disabled: false},
      {topic: "motion/living/ceiling/status", disabled: true},
    ],
    illuminance_sensors: [
      {topic: 'illuminance/living/status'}
    ],
    lights: [
      {topic: "light/living/command", disabled: false}
    ],
    air_conditioners: [
      {topic: 'heater/living/command'}
    ],

    nightTimeOnly: true,

    // Legacy syntax
    /*
    motion_sensor_topics: ["motion/living/status"],
    light_topics: ["light/living/command"],
    illuminance_topics: ['illuminance/living/status'],
    */

  },
  {
    name: "kitchen",

    // experimental
    motion_sensors: [
      {topic: "motion/kitchen/status", disabled: false},
      {topic: "motion/kitchen/ceiling/status", disabled: true},
    ],
    illuminance_sensors: [
      {topic: 'illuminance/kitchen/status'}
    ],
    lights: [
      {topic: "light/kitchen/command", disabled: false}
    ],
    air_conditioners: [
      {topic: 'ac/kitchen/command'}
    ],

    // legacy topics
    /*
    motion_sensor_topics: ["motion/kitchen/status"],
    light_topics: ["light/kitchen/command"],
    illuminance_topics: ['illuminance/kitchen/status'],
    ac_command_topics: ['ac/kitchen/command'],
    */
    nightTimeOnly: true,
  },
  {
    name: "corridor",

    // experimental
    motion_sensors: [
      {topic: "motion/corridor/status", disabled: false},
      {topic: "motion/bathroom/status", disabled: false},
      {topic: "motion/entrance/status", disabled: false},
    ],
    lights: [
      {topic: "light/corridor/command", disabled: false},
      {topic: "light/bathroom/command", disabled: false},
      {topic: "light/entrance/command", disabled: false},
    ],

    motion_sensor_topics: ["motion/corridor/status","motion/bathroom/status","motion/entrance/status"],
    light_topics: ["light/corridor/command","light/bathroom/command","light/entrance/command"],


    nightTimeOnly: false,
  },
  {
    name: "toilet",

    // experimental
    motion_sensors: [
      {topic: "motion/toilet/status", disabled: false},
    ],
    lights: [
      {topic: "light/toilet/command", disabled: false}
    ],

    /*
    motion_sensor_topics: ["motion/toilet/status"],
    light_topics: ["light/toilet/command"],
    */
    nightTimeOnly: false,
  },

  {
    name: "bedroom",

    // experimental
    motion_sensors: [
      {topic: "motion/bedroom/status", disabled: false},
      {topic: "motion/bedroom/ceiling/status", disabled: false},
    ],
    illuminance_sensors: [
      {topic: 'illuminance/bedroom/status'}
    ],
    lights: [
      {topic: "light/bedroom/command", disabled: false}
    ],
    air_conditioners: [
      {topic: 'ac/bedroom/command'}
    ],

    /*
    motion_sensor_topics: ["motion/bedroom/status"],
    light_topics: ["light/bedroom/command"],
    ac_command_topics: ['ac/bedroom/command'],
    illuminance_topics: ['illuminance/bedroom/status'],
    */

    nightTimeOnly: true,
  },
];
