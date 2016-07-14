def join_paths(*paths):
  segments = []
  for path in paths:
    segments += path.split("/")

  return "/".join([seg for seg in segments if seg])

def normalize_path(path):
  segments = []
  for seg in path.split("/"):
    if seg == "..":
      if segments:
        segments.pop()
      else:
        segments.append("..")
    elif seg and seg != ".":
      segments.append(seg)

  return "/".join(segments)
