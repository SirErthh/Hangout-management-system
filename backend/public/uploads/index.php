<?php

// ป้องกันการ list ไฟล์โดยตรงหากมีคนเปิดโฟลเดอร์ uploads ผ่านเบราว์เซอร์
http_response_code(403);
echo 'Forbidden';
