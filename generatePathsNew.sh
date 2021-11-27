#!/usr/bin/env sh
./gradlew corbPathRoot
for i in {1..20}
do
  ./gradlew corbPathChildNew -DURIS-MODULE.LEVEL=$i
done