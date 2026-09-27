export function regenerateSession(
  req
) {
  return new Promise(
    (resolve, reject) => {
      req.session.regenerate(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

export function saveSession(
  req
) {
  return new Promise(
    (resolve, reject) => {
      req.session.save(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

export async function establishUserSession(
  req,
  userId
) {
  await regenerateSession(req);

  req.session.userId =
    userId.toString();

  await saveSession(req);
}

export function destroySession(
  req
) {
  return new Promise(
    (resolve, reject) => {
      req.session.destroy(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}
