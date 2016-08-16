// import module at package root
import {basic} from 'basic';

// import module in a subdir from an alias
import {nested} from '@nested/nested';

// import file from module
import {sub} from 'basic/sub';

console.log(basic());
console.log(nested());

console.log(sub);
