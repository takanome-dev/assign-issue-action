// import {InputOptions} from '@actions/core';

export const getInput = jest.fn().mockImplementation((name: string) => name);
// jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
//   return inputs[name]
// })
// export const getInput = jest
//   .spyOn(core, 'getInput')
//   .mockImplementation((name, options) => {
//     return jest.requireActual('@actions/core').getInput(name, options);
//   });
