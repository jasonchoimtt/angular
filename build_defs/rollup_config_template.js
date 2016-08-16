import * as fs from 'fs';
import baseConfig from '{{base_config}}';

const config = Object.assign({}, baseConfig, {
  entry: '{{entry}}',
  dest: '{{dest}}',
  sourceMap: true,

  banner: '{{banner}}' ? fs.readFileSync('{{banner}}').toString() : '',

  // Make rollup shut up.
  onwarn: msg => {
    if (!msg.match(/as external dependency$/)) {
      console.log(msg);
    }
  }
});

export default config;
