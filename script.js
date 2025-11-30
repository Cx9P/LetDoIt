import { db, localUserId } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const addBtn = document.getElementById("add-btn");

// ==============================
// โหลด todos
// ==============================
async function loadTodos() {
  list.innerHTML = "";
  const ref = collection(db, "users", localUserId, "todos");
  const q = query(ref, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  snapshot.docs.forEach((docSnap, index) => {
    const data = docSnap.data();
    const li = createTodoItem(docSnap.id, data.text, index, data.notifyTime);
    list.appendChild(li);
  });
}

// ==============================
// สร้าง todo item
// ==============================
function createTodoItem(id, text, index, notifyTime) {
  const li = document.createElement("li");
  li.className = "item";
  li.dataset.id = id;

  const numberSpan = document.createElement("span");
  numberSpan.className = "number";
  numberSpan.textContent = `${index + 1}.`;

  const textSpan = document.createElement("span");
  textSpan.textContent = text;
  textSpan.className = "todo-text";

  const delBtn = document.createElement("button");
  delBtn.textContent = "ลบ";
  delBtn.onclick = async () => {
    await deleteDoc(doc(db, "users", localUserId, "todos", id));
    loadTodos();
  };

  // ปุ่มตั้งแจ้งเตือน
  const notifyBtn = document.createElement("button");
  notifyBtn.textContent = "แจ้งเตือน";
  notifyBtn.onclick = () => setNotify(id, text);

  li.appendChild(numberSpan);
  li.appendChild(textSpan);
  li.appendChild(notifyBtn);
  li.appendChild(delBtn);

  enableTouchDrag(li); // รองรับ iPhone

  return li;
}

// ==============================
// Touch-based Drag (iPhone รองรับ)
// ==============================
function enableTouchDrag(li) {
  let startY = 0;
  let dragging = false;
  let placeholder;

  li.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    dragging = true;

    li.classList.add("dragging");

    placeholder = document.createElement("li");
    placeholder.className = "placeholder";
    placeholder.style.height = li.offsetHeight + "px";

    li.parentNode.insertBefore(placeholder, li.nextSibling);
  });

  li.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    e.preventDefault();

    const y = e.touches[0].clientY;
    li.style.transform = `translateY(${y - startY}px)`;

    const after = getDragAfterElementTouch(list, y);
    if (after == null) {
      list.appendChild(placeholder);
    } else {
      list.insertBefore(placeholder, after);
    }
  });

  li.addEventListener("touchend", async () => {
    dragging = false;
    li.classList.remove("dragging");
    li.style.transform = "";

    list.insertBefore(li, placeholder);
    placeholder.remove();

    await saveOrder();
    loadTodos();
  });
}

// หา element หลัง pointer
function getDragAfterElementTouch(list, y) {
  const items = [...list.querySelectorAll(".item:not(.dragging)")];

  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// ==============================
// เพิ่มงานใหม่
// ==============================
addBtn.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  const ref = collection(db, "users", localUserId, "todos");
  const snapshot = await getDocs(ref);
  const maxOrder = snapshot.docs.reduce((max, docSnap) => {
    const o = docSnap.data().order ?? 0;
    return o > max ? o : max;
  }, 0);

  await addDoc(ref, { text, order: maxOrder + 1 });
  input.value = "";
  loadTodos();
};

// ==============================
// บันทึกลำดับ (Drag & Drop)
// ==============================
async function saveOrder() {
  const items = [...list.querySelectorAll(".item")];
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id;
    await updateDoc(doc(db, "users", localUserId, "todos", id), {
      order: i + 1,
    });
  }
}

// ==============================
// ระบบแจ้งเตือน Notification API
// ==============================
async function setNotify(id, text) {
  // ขออนุญาตแจ้งเตือน
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }

  const time = prompt("ตั้งเวลาแจ้งเตือน (รูปแบบ HH:MM) เช่น 18:30");
  if (!time) return;

  const now = new Date();
  const [h, m] = time.split(":").map((n) => parseInt(n));
  const notifyTime = new Date();
  notifyTime.setHours(h, m, 0, 0);

  // ถ้าเวลาที่ตั้งผ่านมาแล้ว ให้เป็นวันถัดไป
  if (notifyTime < now) notifyTime.setDate(notifyTime.getDate() + 1);

  const delay = notifyTime - now;

  setTimeout(() => {
    new Notification("เตือนงานของคุณ", {
      body: text,
      icon: "bell.png"
    });
  }, delay);

  // เก็บเวลาใน Firebase
  await updateDoc(doc(db, "users", localUserId, "todos", id), {
    notifyTime: notifyTime.toISOString(),
  });

  alert("ตั้งแจ้งเตือนเรียบร้อย!");
}

// โหลดเริ่มต้น
loadTodos();
