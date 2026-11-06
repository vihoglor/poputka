from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserAvatar
from app.schemas import UserOut
from app.security import current_user

router = APIRouter(prefix='/api/users', tags=['Профиль'])


@router.get('/{user_id}/avatar', responses={404: {'description': 'Фото не найдено'}})
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    avatar = db.get(UserAvatar, user_id)
    if avatar is None:
        raise HTTPException(status_code=404, detail='Фотография не найдена')
    return Response(content=avatar.jpeg_data, media_type='image/jpeg', headers={'Cache-Control': 'private, max-age=60'})


@router.post('/me/avatar', response_model=UserOut, responses={400: {'description': 'Неверный формат изображения'}, 413: {'description': 'Слишком большой файл'}})
async def set_avatar(photo: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    content = await photo.read(2 * 1024 * 1024 + 1)
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='Максимальный размер фотографии — 2 МБ')
    try:
        with Image.open(BytesIO(content)) as source:
            if source.format not in ('JPEG', 'PNG', 'WEBP') or source.width * source.height > 12000000:
                raise ValueError('Invalid image')
            picture = ImageOps.fit(ImageOps.exif_transpose(source).convert('RGB'), (400, 400), method=Image.Resampling.LANCZOS)
            output = BytesIO()
            picture.save(output, format='JPEG', quality=85, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail='Выберите корректное изображение JPG, PNG или WebP до 12 Мп')
    avatar = db.get(UserAvatar, user.id)
    if avatar is None:
        avatar = UserAvatar(user_id=user.id, jpeg_data=output.getvalue())
        db.add(avatar)
    else:
        avatar.jpeg_data = output.getvalue()
        avatar.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(user)
    return user


@router.delete('/me/avatar', status_code=204)
def delete_avatar(user: User = Depends(current_user), db: Session = Depends(get_db)):
    avatar = db.get(UserAvatar, user.id)
    if avatar is not None:
        db.delete(avatar)
        db.commit()
