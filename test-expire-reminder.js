/*
 * @Author: diaochan diaochan@seatent.com
 * @Date: 2026-05-07 17:30:47
 * @LastEditors: diaochan diaochan@seatent.com
 * @LastEditTime: 2026-05-07 17:30:51
 * @FilePath: /wx_ziyouyueke_service/test-expire-reminder.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// test-expire-reminder.js
require('dotenv').config();

const lessonExpireReminderService = require('./src/shared/services/lessonExpireReminderService');

lessonExpireReminderService.sendExpiringReminders().then(() => {
  console.log('执行完毕');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});