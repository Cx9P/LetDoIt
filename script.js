import { db, localUserId } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const addBtn = document.getElementById("add-btn");

// โหลด todos ตาม order
async function loadTodos() {
  list.innerHTML = "";
  const ref = collection(db, "users", localUserId, "todos");
  const q = query(ref, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  snapshot.docs.forEach((docSnap, index) => {
    const li = createTodoItem(docSnap.id, docSnap.data().text, index);
    list.appendChild(li);
  });
}

// สร้าง element todo พร้อมแสดงเลขลำดับ
function createTodoItem(id, text, index) {
  const li = document.createElement("li");
  li.className = "item";
  li.draggable = true;
  li.dataset.id = id;

  const numberSpan = document.createElement("span");
  numberSpan.className = "number";
  numberSpan.textContent = `${index + 1}.`;

  const textSpan = document.createElement("span");
  textSpan.textContent = text;

  const delBtn = document.createElement("button");
  delBtn.textContent = "ลบ";
  delBtn.onclick = async () => {
    await deleteDoc(doc(db, "users", localUserId, "todos", id));
    loadTodos();
  };

  li.appendChild(numberSpan);
  li.appendChild(textSpan);
  li.appendChild(delBtn);

  // Drag & Drop
  li.addEventListener("dragstart", () => li.classList.add("dragging"));
  li.addEventListener("dragend", async () => {
    li.classList.remove("dragging");
    await saveOrder();
    loadTodos(); // รีโหลดเพื่ออัพเดตเลขลำดับ
  });

  return li;
}

// เพิ่มงานใหม่
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

// Drag & Drop reorder
list.addEventListener("dragover", e => {
  e.preventDefault();
  const dragging = document.querySelector(".dragging");
  const afterElement = getDragAfterElement(list, e.clientY);
  if (!afterElement) list.appendChild(dragging);
  else list.insertBefore(dragging, afterElement);
});

// หา element หลัง drag
function getDragAfterElement(list, y) {
  const items = [...list.querySelectorAll(".item:not(.dragging)")];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// บันทึกลำดับลง Firebase
async function saveOrder() {
  const items = [...list.querySelectorAll(".item")];
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id;
    await updateDoc(doc(db, "users", localUserId, "todos", id), { order: i + 1 });
  }
}

// เริ่มโหลด
loadTodos();
